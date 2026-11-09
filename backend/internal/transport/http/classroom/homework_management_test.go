package classroom

import (
	"encoding/json"
	"testing"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
)

func TestHomeworkManagementAndConfirmedBlanks(t *testing.T) {
	db, request := homeworkHTTPFixture(t)
	now := time.Now().UTC()
	publish := func() HomeworkResponse {
		r := request(1, "POST", "/classrooms/class/homeworks", HomeworkPublishRequest{BankID: "homework-1", StartsAt: now.Add(-time.Hour), Deadline: now.Add(time.Hour)}, 200)
		var body struct {
			Data HomeworkResponse `json:"data"`
		}
		if err := json.Unmarshal(r.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		return body.Data
	}
	item := publish()
	path := "/homeworks/" + item.ID
	extend := HomeworkManageRequest{Action: "extend", Deadline: now.Add(2 * time.Hour), Reason: "Class needs more time"}
	request(4, "POST", path+"/manage", extend, 403)
	request(2, "POST", path+"/manage", extend, 404)
	request(1, "POST", path+"/manage", extend, 200)
	request(1, "POST", path+"/manage", HomeworkManageRequest{Action: "release", Reason: "Too early"}, 400)
	answers := make([][]string, len(item.Questions))
	for i, q := range item.Questions {
		answers[i] = make([]string, q.BlankCount)
	}
	request(4, "POST", path+"/submissions", HomeworkSubmitRequest{Answers: answers}, 400)
	request(4, "POST", path+"/submissions", HomeworkSubmitRequest{Answers: answers, ConfirmBlank: true}, 200)
	request(1, "POST", path+"/manage", HomeworkManageRequest{Action: "withdraw", Reason: "Mistake"}, 400)
	request(2, "POST", path+"/students/student/corrections", HomeworkCorrectRequest{Score: 42, Reason: "Manual credit"}, 404)
	request(4, "POST", path+"/students/student/corrections", HomeworkCorrectRequest{Score: 42, Reason: "Manual credit"}, 403)
	request(1, "POST", path+"/students/student/corrections", HomeworkCorrectRequest{Score: 42, Reason: "Manual credit"}, 200)
	request(1, "POST", path+"/students/student/corrections", HomeworkCorrectRequest{Score: 40, Reason: "Rechecked"}, 200)
	report := request(1, "GET", path+"/report", nil, 200)
	var body struct {
		Data HomeworkReportResponse `json:"data"`
	}
	if err := json.Unmarshal(report.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	sub := body.Data.Submissions[0]
	if sub.Score != 40 || sub.OriginalScore != 0 || len(sub.Corrections) != 2 || sub.Corrections[1].Before != 42 || sub.Results[0].Score != 0 {
		t.Fatalf("lost grading history: %+v", sub)
	}
	var row models.ClassroomHomeworkSubmission
	// The score column is also the source used by grade exports.
	if err := db.First(&row).Error; err != nil || row.Score != 40 {
		t.Fatalf("stored export score: %+v %v", row, err)
	}
	if err := db.Model(&models.ClassroomHomework{}).Where("public_id = ?", item.ID).Update("deadline", now.Add(-time.Minute)).Error; err != nil {
		t.Fatal(err)
	}
	request(1, "POST", path+"/manage", HomeworkManageRequest{Action: "release", Reason: "Review is open"}, 200)
	request(1, "POST", path+"/manage", extend, 400)
	request(4, "POST", path+"/submissions", HomeworkSubmitRequest{Answers: answers, ConfirmBlank: true}, 409)
	var list struct {
		Data StudentHomeworksResponse `json:"data"`
	}
	if err := json.Unmarshal(request(4, "GET", "/student/homeworks", nil, 200).Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}
	released := list.Data.Items[0]
	if !released.FeedbackReleased || len(released.Questions[0].Accepted) == 0 || released.Questions[0].Explanation == "" {
		t.Fatal("released feedback missing")
	}
	var audit models.ClassroomHomework
	if err := db.Where("public_id = ?", item.ID).First(&audit).Error; err != nil {
		t.Fatal(err)
	}
	var changes []domain.HomeworkChange
	if err := json.Unmarshal([]byte(audit.Changes), &changes); err != nil || len(changes) != 2 || changes[0].Actor != 1 || changes[0].Reason != extend.Reason {
		t.Fatalf("missing audit: %+v %v", changes, err)
	}
	withdrawn := publish()
	request(1, "POST", "/homeworks/"+withdrawn.ID+"/manage", HomeworkManageRequest{Action: "withdraw", Reason: "Wrong publication"}, 200)
	request(4, "POST", "/homeworks/"+withdrawn.ID+"/submissions", HomeworkSubmitRequest{Answers: answers, ConfirmBlank: true}, 409)
	if err := json.Unmarshal(request(4, "GET", "/student/homeworks", nil, 200).Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}
	if len(list.Data.Items) != 1 {
		t.Fatal("withdrawn homework still visible")
	}
}

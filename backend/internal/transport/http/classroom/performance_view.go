package classroom

import (
	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
)

func (p PerformanceOptions) application() domain.PerformanceOptions {
	return domain.PerformanceOptions{StartAt: p.StartAt, EndAt: p.EndAt, QuizIDs: p.QuizIDs}
}

func (p FinalizePerformance) application() app.FinalizePerformance {
	r := app.FinalizePerformance{Title: p.Title, Options: p.Options.application(), Fingerprint: p.Fingerprint, Corrections: []app.PerformanceCorrection{}}
	for _, c := range p.Corrections {
		r.Corrections = append(r.Corrections, app.PerformanceCorrection{StudentID: c.StudentID, Score: c.Score, Reason: c.Reason})
	}
	return r
}

func performanceRecordResponse(r *domain.PerformanceRecord) *PerformanceRecord {
	if r == nil {
		return nil
	}
	return &PerformanceRecord{ID: r.ID, Title: r.Title, CreatedAt: r.CreatedAt, Report: performanceReportResponse(r.Report)}
}

func performanceReportResponse(r domain.PerformanceReport) PerformanceReport {
	result := PerformanceReport{Version: r.Version, ClassroomID: r.ClassroomID, Options: PerformanceOptions{StartAt: r.Options.StartAt, EndAt: r.Options.EndAt, QuizIDs: append([]string{}, r.Options.QuizIDs...)}, Mean: r.Mean, Deviation: r.Deviation, Eligible: r.Eligible, Conversion: r.Conversion, Fingerprint: r.Fingerprint, Activities: []PerformanceActivity{}, Students: []PerformanceStudent{}}
	for _, a := range r.Activities {
		result.Activities = append(result.Activities, PerformanceActivity{ID: a.ID, Title: a.Title, Phase: a.Phase, SourceQuizID: a.SourceQuizID, ClosedAt: a.ClosedAt})
	}
	for _, s := range r.Students {
		row := PerformanceStudent{UserID: s.UserID, StudentID: s.StudentID, Username: s.Username, Name: s.Name, Quality: s.Quality, Participation: s.Participation, Growth: s.Growth, Consistency: s.Consistency, ExpectedWeeks: s.ExpectedWeeks, ActiveWeeks: s.ActiveWeeks, Pairs: s.Pairs, Improved: s.Improved, Retained: s.Retained, Regressed: s.Regressed, Unresolved: s.Unresolved, MissingPairs: s.MissingPairs, Raw: s.Raw, Rank: s.Rank, Converted: s.Converted, Final: s.Final, Reason: s.Reason, Status: s.Status, Stages: []PerformanceStage{}, Evidence: []PerformanceEvidence{}}
		for _, stage := range s.Stages {
			row.Stages = append(row.Stages, PerformanceStage{Phase: stage.Phase, Expected: stage.Expected, Completed: stage.Completed, Quality: stage.Quality, Participation: stage.Participation})
		}
		for _, e := range s.Evidence {
			row.Evidence = append(row.Evidence, PerformanceEvidence{QuizID: e.QuizID, Title: e.Title, Phase: e.Phase, SourceQuizID: e.SourceQuizID, QuestionID: e.QuestionID, ConceptID: e.ConceptID, ClosedAt: e.ClosedAt, Submitted: e.Submitted, Points: e.Points, Total: e.Total, Outcome: e.Outcome})
		}
		result.Students = append(result.Students, row)
	}
	return result
}

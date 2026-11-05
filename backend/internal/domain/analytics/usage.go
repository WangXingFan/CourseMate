package analytics

import "time"

// Reporting days use the course's fixed Beijing time zone on every client.
var ReportingZone = time.FixedZone("Asia/Shanghai", 8*60*60)

type Resource struct{ Key, Category string }

// Only product routes are recorded; URLs, search text and document IDs are not stored.
var Resources = map[string]Resource{
	"/chat": {"chat", "assistant"}, "/recent": {"recent", "assistant"},
	"/knowledge-bases": {"knowledgeBases", "assistant"},
	"/learn":           {"learning", "learning"}, "/learn/knowledge": {"courseKnowledge", "learning"},
	"/learn/quiz": {"quiz", "learning"}, "/learn/progress": {"progress", "learning"}, "/learn/mastery": {"mastery", "learning"},
	"/learn/python": {"python", "tools"}, "/learn/workbench": {"workbench", "tools"},
	"/learn/convolution": {"convolution", "tools"}, "/learn/sampling": {"sampling", "tools"},
	"/learn/fourier-series": {"fourierSeries", "tools"}, "/learn/fourier-transform": {"fourierTransform", "tools"},
	"/learn/first-order": {"firstOrder", "tools"}, "/learn/second-order": {"secondOrder", "tools"},
	"/learn/laplace": {"laplace", "tools"}, "/learn/modulation": {"modulation", "tools"},
	"/learn/experiments": {"experiments", "experiments"}, "/learn/experiments/workspace": {"experimentWorkspace", "experiments"},
	"/learn/experiments/assessment": {"assessment", "experiments"}, "/learn/experiments/guide": {"experimentGuide", "experiments"},
	"/learn/experiments/signal-basics": {"signalBasics", "experiments"}, "/learn/experiments/time-domain": {"timeDomain", "experiments"},
	"/learn/experiments/frequency-domain": {"frequencyDomain", "experiments"}, "/learn/experiments/s-domain": {"sDomain", "experiments"},
	"/homeworks": {"homeworks", "classroom"}, "/activities": {"activities", "classroom"},
	"/classrooms": {"classrooms", "classroom"}, "/roll-call": {"rollCall", "classroom"},
	"/analytics": {"analytics", "management"}, "/admin": {"admin", "management"},
	"/admin/users": {"accounts", "management"}, "/admin/models": {"models", "management"},
	"/admin/upstreams": {"upstreams", "management"}, "/admin/knowledge-bases": {"platformKnowledge", "management"},
	"/settings/account": {"accountSettings", "management"}, "/settings/general": {"generalSettings", "management"},
	"/settings/chat": {"chatSettings", "management"}, "/settings/about": {"about", "management"},
}

type Visit struct {
	EventID   string
	UserID    uint
	Resource  string
	CreatedAt time.Time
}

type Filter struct {
	TeacherID, ClassroomID uint
	From, Until            time.Time
}

type Classroom struct {
	ID               uint
	PublicID, Name   string
	Students, Visits int64
}

type Daily struct {
	Date   string
	Visits int64
}

type ResourceUsage struct {
	Resource string
	Visits   int64
}

type Summary struct {
	Visits, Users                                         int64
	PracticeAnswers, HomeworkSubmissions, QuizSubmissions int64
}

type Report struct {
	Scope                    string
	From, Until, GeneratedAt time.Time
	FirstVisitAt             *time.Time
	Summary                  Summary
	Daily                    []Daily
	Resources                []ResourceUsage
	Classrooms               []Classroom
	Homeworks                []Assessment
	Labs                     []Assessment
	Lessons                  []LessonStats
}

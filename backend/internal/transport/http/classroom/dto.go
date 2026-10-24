package classroom

import "time"

// ClassroomResponse 是班级列表和详情共用的公开视图。
type ClassroomResponse struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	TeacherName  string    `json:"teacherName"`
	StudentCount int64     `json:"studentCount"`
	CreatedAt    time.Time `json:"createdAt"`
}

// ClassroomListResponse 是班级列表响应。
type ClassroomListResponse struct {
	Classrooms []ClassroomResponse `json:"classrooms"`
}

// ClassroomDataResponse 是单班级操作响应。
type ClassroomDataResponse struct {
	Classroom ClassroomResponse `json:"classroom"`
}

// CreateClassroomRequest 是创建班级的请求。
type CreateClassroomRequest struct {
	Name        string `json:"name" binding:"required" example:"2026 级一班"`
	Description string `json:"description" example:"计算机基础课程行政班"`
}

// UpdateClassroomRequest 是更新班级信息的请求。
type UpdateClassroomRequest struct {
	Name        string `json:"name" binding:"required" example:"2026 级二班"`
	Description string `json:"description" example:"计算机基础课程行政班"`
}

// AddStudentRequest 通过登录用户名把学生账号加入班级。
type AddStudentRequest struct {
	Username string `json:"username" binding:"required" example:"s20260001"`
}

// StudentResponse 是班级成员的公开视图。
type StudentResponse struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
}

// StudentListResponse 是班级成员列表响应。
type StudentListResponse struct {
	Students []StudentResponse `json:"students"`
}

// ClassroomMutationResponse 表示班级或成员关系已被修改。
type ClassroomMutationResponse struct {
	Updated bool `json:"updated"`
}

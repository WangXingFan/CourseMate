package classroom

import (
	"net/http"

	appclassroom "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type CreateStudentAccountRequest struct {
	Username    string `json:"username" binding:"required,max=16"`
	DisplayName string `json:"displayName" binding:"omitempty,max=128"`
	Email       string `json:"email" binding:"omitempty,max=128"`
}

type ClassroomStudentCredentialResponse struct {
	Username        string `json:"username"`
	DisplayName     string `json:"displayName"`
	InitialPassword string `json:"initialPassword"`
}

type CreateClassroomStudentAccountResponse struct {
	Student ClassroomStudentCredentialResponse `json:"student"`
}

type ImportClassroomStudentsRequest struct {
	CSV string `json:"csv" binding:"required"`
}

type ClassroomStudentImportRowResponse struct {
	Line     int    `json:"line"`
	Username string `json:"username"`
	Status   string `json:"status" enums:"created,duplicate,exists,invalid,failed"`
}

type ClassroomStudentImportResponse struct {
	Total       int                                  `json:"total"`
	Created     int                                  `json:"created"`
	Skipped     int                                  `json:"skipped"`
	Failed      int                                  `json:"failed"`
	Rows        []ClassroomStudentImportRowResponse  `json:"rows"`
	Credentials []ClassroomStudentCredentialResponse `json:"credentials"`
}

// CreateStudentAccount godoc
// @Summary 教师创建学生账号并加入班级
// @Description 仅限班级所属教师；创建学生角色账号，返回随机初始密码，首次登录须修改密码。已有账号不会被覆盖。
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级公开 ID"
// @Param payload body CreateStudentAccountRequest true "学生资料"
// @Success 200 {object} CreateClassroomStudentAccountResponse
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 409 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /classrooms/{id}/students/accounts [post]
func (h *Handler) CreateStudentAccount(c *gin.Context) {
	id, ok := classroomIDFromPath(c)
	if !ok {
		return
	}
	c.Header("Cache-Control", "no-store")
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var req CreateStudentAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	credential, err := h.service.CreateStudentAccount(c.Request.Context(), middleware.MustUserID(c), id, appclassroom.StudentAccountInput{
		Username: req.Username, DisplayName: req.DisplayName, Email: req.Email,
	})
	if err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, CreateClassroomStudentAccountResponse{Student: studentCredentialResponse(*credential)})
}

// ImportStudentAccounts godoc
// @Summary 教师导入学生名单并创建账号
// @Description 仅限班级所属教师。UTF-8 CSV 表头为 username,displayName,email 或 学号,姓名,邮箱（邮箱列可省略），最多 200 行、1 MiB；逐行创建并加入班级，已有账号跳过且不覆盖，返回初始密码和逐行结果。
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级公开 ID"
// @Param payload body ImportClassroomStudentsRequest true "CSV 文件内容"
// @Success 200 {object} ClassroomStudentImportResponse
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /classrooms/{id}/students/accounts/import [post]
func (h *Handler) ImportStudentAccounts(c *gin.Context) {
	id, ok := classroomIDFromPath(c)
	if !ok {
		return
	}
	c.Header("Cache-Control", "no-store")
	// JSON escaping can expand a CSV byte up to sixfold. The application also
	// checks the decoded byte limit, before parsing or writing anything.
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 6*appclassroom.StudentCSVMaxBytes+1024)
	var req ImportClassroomStudentsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	result, err := h.service.ImportStudentAccounts(c.Request.Context(), middleware.MustUserID(c), id, []byte(req.CSV))
	if err != nil {
		h.writeError(c, err)
		return
	}
	view := ClassroomStudentImportResponse{
		Total: result.Total, Created: result.Created, Skipped: result.Skipped, Failed: result.Failed,
		Rows: []ClassroomStudentImportRowResponse{}, Credentials: []ClassroomStudentCredentialResponse{},
	}
	for _, row := range result.Rows {
		view.Rows = append(view.Rows, ClassroomStudentImportRowResponse{Line: row.Line, Username: row.Username, Status: row.Status})
	}
	for _, credential := range result.Credentials {
		view.Credentials = append(view.Credentials, studentCredentialResponse(credential))
	}
	response.Success(c, view)
}

func studentCredentialResponse(credential appclassroom.StudentCredential) ClassroomStudentCredentialResponse {
	return ClassroomStudentCredentialResponse{
		Username: credential.Username, DisplayName: credential.DisplayName, InitialPassword: credential.InitialPassword,
	}
}

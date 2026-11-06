package exports

import (
	"fmt"
	"time"

	"github.com/xuri/excelize/v2"
)

var titles = map[string]string{"homeworks": "作业成绩", "labs": "实验成绩", "attendance": "签到考勤", "summary": "综合成绩", "reports": "实验报告"}
var courseNames = map[string]string{"L1": "信号与系统的时域分析", "L2": "信号与系统的频域分析", "L3": "信号与系统的复频域分析"}
var beijing = time.FixedZone("Asia/Shanghai", 8*60*60)

func date(t time.Time) string { return t.In(beijing).Format("2006-01-02 15:04:05") }

type sheet struct {
	name string
	rows [][]any
}

func workbook(d dataset, o Options) (*File, error) {
	f := excelize.NewFile()
	defer f.Close()
	sheets := []sheet{}
	if o.Kind == "summary" {
		header := []any{"学号", "姓名"}
		keys := []string{}
		for _, key := range []string{"homeworks", "labs", "attendance"} {
			if o.Weights[key] > 0 {
				keys = append(keys, key)
				header = append(header, titles[key]+"（百分制）", titles[key]+"权重（%）", titles[key]+"加权分")
			}
		}
		header = append(header, "最终得分", "状态")
		rows := [][]any{header}
		for _, st := range d.students {
			row := []any{st.Username, st.DisplayName}
			total, valid := 0.0, true
			for _, key := range keys {
				score, ok := d.score(st.ID, key)
				if !ok {
					valid = false
					row = append(row, "无考核数据", o.Weights[key], "")
				} else {
					weighted := score * o.Weights[key] / 100
					total += weighted
					row = append(row, rounded(score), o.Weights[key], rounded(weighted))
				}
			}
			if valid {
				row = append(row, rounded(total), "已计算")
			} else {
				row = append(row, "", "所选项目缺少数据，请调整汇总项")
			}
			rows = append(rows, row)
		}
		sheets = append(sheets, sheet{"综合成绩", rows})
	}
	for _, key := range []string{"homeworks", "labs", "attendance"} {
		if o.Kind == key || o.Kind == "summary" && o.Weights[key] > 0 {
			sheets = append(sheets, detailSheets(d, key)...)
		}
	}
	mode := "仅已结束的作业和实验"
	if o.IncludeOngoing {
		mode = "已开始的作业和实验（包含进行中，当前成绩）"
	}
	sheets = append(sheets, sheet{"导出说明", [][]any{
		{"项目", "规则"}, {"班级", d.class.Name}, {"导出时间（北京时间）", date(d.now)}, {"范围", "当前班级名单；累计记录；" + mode},
		{"作业成绩", "每份作业转换为百分制后等权平均；未提交计 0 分。"},
		{"实验成绩", "每个实验满分 100；四任务各 25 分，沿用服务端评分和教师更正，各实验等权平均；未得分任务计 0 分。"},
		{"验收完成", "四个任务均提交正式验收才标记完成；不以练习保存或得分代替完成状态。"},
		{"考勤成绩", "max(0, 100 − 迟到次数 × 10 − 缺勤次数 × 20)；正常到课、请假不扣分。仅统计已结束签到；不在该场应到名单的学生不扣分。"},
		{"综合成绩", "各项百分制成绩 × 对应权重之和；权重合计 100%；最终结果保留两位小数，中间计算不提前舍入。"},
		{"缺少数据", "所选项目无考核，或学生无应到签到记录时，最终成绩留空；不会自动重新分配权重。"},
	}})
	for i, s := range sheets {
		if i == 0 {
			if err := f.SetSheetName("Sheet1", s.name); err != nil {
				return nil, err
			}
		} else {
			if _, err := f.NewSheet(s.name); err != nil {
				return nil, err
			}
		}
		for row, cells := range s.rows {
			cell, err := excelize.CoordinatesToCellName(1, row+1)
			if err != nil {
				return nil, err
			}
			// SetSheetRow writes strings as text, preserving leading-zero student numbers
			// and preventing names/titles from becoming spreadsheet formulas.
			if err := f.SetSheetRow(s.name, cell, &cells); err != nil {
				return nil, err
			}
		}
		end, _ := excelize.ColumnNumberToName(len(s.rows[0]))
		if err := f.SetColWidth(s.name, "A", end, 22); err != nil {
			return nil, err
		}
		if s.name == "导出说明" {
			if err := f.SetColWidth(s.name, "B", "B", 110); err != nil {
				return nil, err
			}
		}
		style, err := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Color: "FFFFFF"}, Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"26384A"}}})
		if err != nil {
			return nil, err
		}
		if err := f.SetCellStyle(s.name, "A1", end+"1", style); err != nil {
			return nil, err
		}
		if err := f.SetPanes(s.name, &excelize.Panes{Freeze: true, YSplit: 1, TopLeftCell: "A2", ActivePane: "bottomLeft"}); err != nil {
			return nil, err
		}
	}
	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return &File{safeName(d.class.Name+"_"+titles[o.Kind]) + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes()}, nil
}

func detailSheets(d dataset, kind string) []sheet {
	header := []any{"学号", "姓名", "平均分（百分制）"}
	if kind == "attendance" {
		header = []any{"学号", "姓名", "应到次数", "正常到课", "迟到", "缺勤", "请假", "考勤分"}
	}
	summary := [][]any{header}
	for _, st := range d.students {
		score, ok := d.score(st.ID, kind)
		var value any = "无考核数据"
		if ok {
			value = rounded(score)
		}
		row := []any{st.Username, st.DisplayName, value}
		if kind == "attendance" {
			a := d.attendanceScore(st.ID)
			row = []any{st.Username, st.DisplayName, a.count(), a.Present, a.Late, a.Absent, a.Excused, value}
		}
		summary = append(summary, row)
	}
	rows := [][]any{}
	switch kind {
	case "homeworks":
		rows = append(rows, []any{"学号", "姓名", "作业", "开始时间", "截止时间", "原始得分", "满分", "百分制", "提交状态", "提交时间", "作业 ID"})
		for _, h := range d.homeworks {
			for _, st := range d.students {
				sub, ok := h.submissions[st.ID]
				status, submitted, score := "未提交", "", 0.0
				if ok {
					status, submitted = "已提交", date(sub.SubmittedAt)
				}
				if h.item.Total() > 0 {
					score = float64(sub.Score) / float64(h.item.Total()) * 100
				}
				rows = append(rows, []any{st.Username, st.DisplayName, h.item.Title, date(h.item.StartsAt), date(h.item.Deadline), sub.Score, h.item.Total(), rounded(score), status, submitted, h.item.PublicID})
			}
		}
	case "labs":
		rows = append(rows, []any{"学号", "姓名", "实验", "得分（满分100）", "已验收任务数", "完成状态", "任务1（25）", "任务2（25）", "任务3（25）", "任务4（25）", "考核状态", "考核 ID"})
		for _, l := range d.labs {
			for _, st := range d.students {
				state := l.states[st.ID]
				score, completed := labScore(state, l.item.CourseID)
				status := "未完成"
				if completed == 4 {
					status = "已完成"
				}
				phase := "进行中"
				if l.item.Final(d.now) {
					phase = "已结束"
				}
				row := []any{st.Username, st.DisplayName, l.item.CourseID + " " + courseNames[l.item.CourseID], rounded(score), fmt.Sprintf("%d/4", completed), status}
				for _, task := range []string{"-1", "-2", "-3", "-4"} {
					value := 0.0
					if t := state.Tasks[l.item.CourseID+task]; t != nil {
						_, _, _, value = t.Scores()
					}
					row = append(row, rounded(value))
				}
				rows = append(rows, append(row, phase, l.item.ID))
			}
		}
	case "attendance":
		rows = append(rows, []any{"学号", "姓名", "签到名称", "开始时间", "状态", "签到时间", "更正原因", "签到 ID"})
		labels := map[string]string{"present": "正常到课", "late": "迟到", "absent": "缺勤", "excused": "请假"}
		for _, a := range d.attendance {
			for _, st := range d.students {
				r, ok := a.records[st.ID]
				status, checked, reason := "不在本场应到名单", "", ""
				if ok {
					status = labels[r.Status]
				}
				if r.CheckedAt != nil {
					checked = date(*r.CheckedAt)
				}
				if len(r.Corrections) > 0 {
					reason = r.Corrections[len(r.Corrections)-1].Reason
				}
				rows = append(rows, []any{st.Username, st.DisplayName, a.item.Title, date(a.item.StartsAt), status, checked, reason, a.item.ID})
			}
		}
	}
	return []sheet{{titles[kind], summary}, {titles[kind] + "明细", rows}}
}

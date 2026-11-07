package exports

import "fmt"

func performanceValue(v *float64) any {
	if v == nil {
		return ""
	}
	return rounded(*v)
}

func performanceSheets(d dataset) []sheet {
	rows := [][]any{{"学号", "姓名", "课前得分", "课前完成题/应做题", "课中得分", "课中完成题/应做题", "课后得分", "课后完成题/应做题", "答题质量", "任务参与", "订正与保持", "持续参与", "参与周/教学周", "错→对", "对→对", "对→错", "错→错", "缺交配对", "综合原始分", "班内名次（并列取平均）", "正态换算分", "课堂成绩", "状态", "修正原因"}}
	details := [][]any{{"学号", "姓名", "活动", "阶段", "截止时间（北京时间）", "题目 ID", "提交状态", "得分", "满分", "配对变化", "活动 ID", "原测 ID"}}
	activities := [][]any{{"活动 ID", "名称", "阶段", "截止时间（北京时间）", "原测 ID"}}
	meta := [][]any{{"项目", "内容"}}
	if r := d.performance; r != nil {
		phases := map[string]string{"pre_class": "课前预习", "in_class": "课中练习", "after_class": "课后巩固"}
		states := map[string]string{"no_data": "暂无评价", "not_participated": "未参与", "assessed": "已评价"}
		outcomes := map[string]string{"improved": "错→对", "retained": "对→对", "regressed": "对→错", "unresolved": "错→错", "missing": "缺交配对"}
		for _, st := range r.Students {
			row := []any{st.Username, st.Name}
			for _, stage := range st.Stages {
				var quality any = ""
				if stage.Expected > 0 {
					quality = rounded(stage.Quality)
				}
				row = append(row, quality, fmt.Sprintf("%d/%d", stage.Completed, stage.Expected))
			}
			row = append(row, rounded(st.Quality), rounded(st.Participation), performanceValue(st.Growth), rounded(st.Consistency), fmt.Sprintf("%d/%d", st.ActiveWeeks, st.ExpectedWeeks), st.Improved, st.Retained, st.Regressed, st.Unresolved, st.MissingPairs, performanceValue(st.Raw), performanceValue(st.Rank), performanceValue(st.Converted), performanceValue(st.Final), states[st.Status], st.Reason)
			rows = append(rows, row)
			for _, e := range st.Evidence {
				status := "未提交"
				if e.Submitted {
					status = "已提交"
				}
				details = append(details, []any{st.Username, st.Name, e.Title, phases[e.Phase], date(e.ClosedAt), e.QuestionID, status, e.Points, e.Total, outcomes[e.Outcome], e.QuizID, e.SourceQuizID})
			}
		}
		for _, a := range r.Activities {
			activities = append(activities, []any{a.ID, a.Title, phases[a.Phase], date(a.ClosedAt), a.SourceQuizID})
		}
		mode := map[string]string{"normal": "正态分位数换算", "small_class": "有效参评少于10人，采用原始分", "all_tied": "全员同分，采用原始分"}
		meta = append(meta, []any{"来源", d.performanceTitle}, []any{"规则版本", r.Version}, []any{"换算方式", mode[r.Conversion]}, []any{"有效参评人数", r.Eligible}, []any{"目标中心", r.Mean}, []any{"目标标准差", r.Deviation})
		if r.Options.StartAt != nil {
			meta = append(meta, []any{"截止时间起点（包含）", date(*r.Options.StartAt)})
		}
		if r.Options.EndAt != nil {
			meta = append(meta, []any{"截止时间终点（不包含）", date(*r.Options.EndAt)})
		}
	}
	return []sheet{{"课堂成绩", rows}, {"课堂答题依据", details}, {"课堂活动范围", activities}, {"课堂计分规则", meta}}
}

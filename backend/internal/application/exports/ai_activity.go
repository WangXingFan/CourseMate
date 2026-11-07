package exports

func aiActivitySheets(d dataset) []sheet {
	summary := [][]any{{"学号", "姓名", "活跃周数", "已结束考核周数", "活跃天数（已结束周）", "有效问答（已结束周）", "AI活跃度分", "状态", "开始日期", "结束日期"}}
	weeks := [][]any{{"学号", "姓名", "周开始", "周结束", "状态", "活跃天数", "有效问答", "计分问答", "活跃天数分（60）", "问答分（40）", "周分（100）"}}
	if d.aiActivity != nil {
		for _, st := range d.aiActivity.Students {
			var score any = ""
			status := "暂无评价"
			if st.Final != nil {
				score, status = *st.Final, "已计算"
			}
			summary = append(summary, []any{st.Username, st.Name, st.ActiveWeeks, st.ExpectedWeeks, st.ActiveDays, st.ValidRounds, score, status, d.aiActivity.StartDate, d.aiActivity.EndDate})
			for _, w := range st.Weeks {
				status := "临时统计（不计入平均分）"
				if w.Status == "closed" {
					status = "已结束"
				}
				weeks = append(weeks, []any{st.Username, st.Name, w.StartDate, w.EndDate, status, w.ActiveDays, w.ValidRounds, w.CountedRounds, w.DayScore, w.RoundScore, w.Score})
			}
		}
	}
	return []sheet{{"AI活跃度", summary}, {"AI活跃度周明细", weeks}}
}

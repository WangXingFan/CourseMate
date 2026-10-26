# 信号与系统 · Python 编程实验 / Python signal labs

这份资源将“表达式 → 生成采样数组 → 计算 → 绘图 → 测量 → 解释”加入三次交互实验。适用 Python 3.11+。代码中的时间为秒、频率为 Hz，相位为 rad。它用离散数组近似连续信号；采样步长与观察窗必须写入实验记录。

## 选择运行方式 / Choose a runtime

### 本地 Python / Local Python

解压整个资源包，在该文件夹打开终端：

```sh
python -m venv .venv
```

Windows PowerShell 无需修改执行策略，直接运行：

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe lab1_time_domain.py
.\.venv\Scripts\python.exe -m jupyterlab
```

macOS / Linux：

```sh
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python lab1_time_domain.py
.venv/bin/python -m jupyterlab
```

每个脚本依次显示四项任务的图形；关闭当前图窗后继续。也可以用 VS Code 的 Python/Jupyter 扩展，按 `# %%` 分节运行。Notebook 里从上到下运行，先导入依赖再运行任务；脚本与 Notebook 是相同代码的两种形式，任选一种。

### 在线 Jupyter / Online notebook

下载 `.ipynb`，在学校 JupyterHub 或 Google Colab 的“上传笔记本”中打开。无需先上传 `.py`，每份 Notebook 都包含自己的完整代码；实验三中的后续任务依赖前面定义的 `solve_response`，请按顺序运行。学校环境缺少依赖时，按教师要求配置，或在个人 Notebook 首格执行 `%pip install numpy scipy matplotlib`。网络与可用服务以学校条件为准。运行后下载自己修改的 Notebook。

The three notebooks are self-contained. Upload one to your school's JupyterHub or Colab, select a Python kernel, and run cells in order. Install NumPy, SciPy and Matplotlib if needed. On a local machine use Python 3.11+ and the commands above. Close each figure window to continue a script. Save your edited notebook, figures and measurements.

## 三次实验 / Files and tasks

| 资源 | 对应任务 | 编程过程 |
| --- | --- | --- |
| `lab1_time_domain.py` / `.ipynb` | L1-1～L1-4 | 正弦、阶跃、指数与三角脉冲生成；时间变换、窄脉冲；系统性质反例；响应分解；数值卷积 |
| `lab2_frequency.py` / `.ipynb` | L2-1～L2-4 | 循环叠加谐波；矩形信号与 FFT；双频输入与连续低通数值求解；采样数组与 sinc 插值 |
| `lab3_laplace.py` / `.ipynb` | L3-1～L3-4 | 生成四类信号并数值积分；独立求解微分方程；初值与响应分解；脉宽候选实验 |

## 每项任务怎么做 / Workflow

1. 在工作台保存预测；Notebook 也填写自己的预测，不覆盖最初的判断。
2. 找到对应的任务编号，逐行解释信号怎样生成。先用默认参数运行，核对单位和图形。
3. 按任务正文修改参数，并至少添加一个自己的表达式、候选或计算步骤。L1-1 需要亲自写余弦和矩形生成语句；L1-4 需要解释连续卷积为何乘步长。
4. 在相同参数下比较 Python 与交互工作台。记录关键时刻、峰值或频率、步长、窗口和差异；不要只比较截图是否相似。
5. 完成 Notebook 中的“预测、修改、数据、解释”，将结论填写到工作台“结果分析”中，格式可用“Python 参数／修改／测量／与工作台差异／解释”。点击保存试验，保留参数来源。

可在绘图后自行加入 `fig.savefig("L1-1.png", dpi=160)`（有 `fig` 的任务）或 `plt.savefig("task.png", dpi=160)`；保存应在 `plt.show()` 之前。数组可用 `np.savetxt("data.csv", np.column_stack([t, y]), delimiter=",", header="t_s,y", comments="")` 导出；将 `y` 换为该任务实际生成的同长度数组。

## 数值约定与常见问题 / Numerical conventions

- Hz 与 rad/s 通过 `omega=2*pi*f` 换算。`np.sin` 输入弧度。
- 连续卷积近似为 `np.convolve(x, h)*dt`；`full` 模式输出比输入长，时间轴从两个首样本时刻之和开始。
- 有限高度脉冲不是理想冲激。中点求和用于避免端点重复计入；减小步长需同时考虑计算量。
- 连续傅里叶变换近似乘 `dt` 并补时间起点相位；正负频率使用 `fftshift`。`np.sinc(q)` 的自变量已经含 π 约定。
- 频谱零点的相位无定义，代码将其遮去；FFT 频率分辨率由观察窗决定。
- 低通滤波由 `scipy.signal.lsim` 数值求解；拟合 0.1–0.2 s 稳态窗口。线性插值输入会有小误差，可减小 `dt` 对照理论幅频式。
- sinc 重建使用有限样本，边缘截断误差不等于混叠。
- 拉氏积分只核验指定收敛区域内的有限个 s 点，不能据此证明整个 ROC；延长积分窗检查截断误差。
- 脉冲响应在输入切换点分段积分，输出连续。改变观察范围或步长时，不要把未观测到的峰值当成真实峰值。
- 图形使用英文坐标，避免依赖学生电脑的中文字体；中文教学步骤在 Notebook 的 Markdown 中。

## 提交与课堂安排 / Evidence

每次提交自己修改的 `.ipynb` 或 `.py`、关键图或 CSV，以及交互实验 PDF/JSON。源代码、Python 图形与运行结果需自行保存并按教师要求交至学校教学平台；CourseMate 不执行 Python，也不会自动上传本地代码或自动批改。

建议课前先完成环境配置；每项 45 分钟可安排为预测 5、交互测量 10、编程修改与比较 15、推导分析 10、核对保存 5 分钟。初次接触 Python 的班级可将部分编程作为课后任务；由教师明确必做任务与提交要求。

每次实验建议至少现场抽查一次“改表达式 → 重新运行 → 解释数据变化”，评价依据包含代码修改和数值核验，避免只运行示例。实验三仍需独立完成解析推导。

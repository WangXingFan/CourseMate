// Link each supported lesson to the corresponding hands-on task.
const tasks: Record<string, string> = {
  "ss-1-1": "L1-1", "ss-1-2": "L1-1", "ss-1-3": "L1-1",
  "ss-1-4": "L1-2", "ss-1-5": "L1-2", "ss-1-6": "L1-2",
  "ss-2-1": "L1-3", "ss-2-2": "L1-3", "ss-2-3": "L1-3", "ss-2-4": "L1-3",
  "ss-2-5": "L1-4", "ss-2-6": "L1-4", "ss-2-9": "L1-4",
  "ss-3-1": "L2-1", "ss-3-2": "L2-1", "ss-3-3": "L2-2", "ss-3-4": "L2-2",
  "ss-3-5": "L2-2", "ss-3-6": "L2-3", "ss-3-7": "L2-3", "ss-3-8": "L2-3", "ss-3-9": "L2-4", "ss-3-10": "L2-2",
  "ss-5-1": "L3-1", "ss-5-2": "L3-1", "ss-5-3": "L3-2", "ss-5-4": "L3-2",
  "ss-5-5": "L3-3", "ss-5-6": "L3-3", "ss-5-7": "L3-3", "ss-5-8": "L3-4", "ss-5-9": "L3-4", "ss-5-10": "L3-4",
};
export function courseExperimentHref(lessonID: string): string {
  return tasks[lessonID] ? `/learn/experiments/workspace#task/${tasks[lessonID]}` : "/learn/experiments";
}

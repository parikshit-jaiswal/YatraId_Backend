export async function evaluateSolution(problemId: string, code: string, language: string) {
  // Fetch problem testcases from DB
  // Run code against testcases (use a code runner service)
  // Return score and passed testcases count
  // This is a stub; implement as per your infra
  return { score: Math.floor(Math.random() * 100), passedTestcases: 5 };
}
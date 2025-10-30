import type { CodeExample } from "@shared/schema";

export interface IStorage {
  getAllExamples(): Promise<CodeExample[]>;
  getExampleById(id: string): Promise<CodeExample | undefined>;
}

export class MemStorage implements IStorage {
  private examples: Map<string, CodeExample>;

  constructor() {
    this.examples = new Map();
    this.initializeExamples();
  }

  private initializeExamples() {
    const exampleData: CodeExample[] = [
      // Group A: Basic Concepts
      {
        id: "1",
        title: "Call Stack Fundamentals",
        code: `function a() { 
            console.log('a'); 
          }
          function b() { 
            a(); 
            console.log('b'); 
          }
          b();`,
        description:
          "Understanding how function calls are pushed and popped from the call stack",
        group: "basic",
        difficulty: "beginner",
        expectedOutput: ["a", "b"],
        learningTips:
          "The call stack is a LIFO (Last In, First Out) structure. When b() is called, it's pushed to the stack. Then a() is pushed on top, executes, and pops off. Finally b() completes and pops off.",
      },
      {
        id: "2",
        title: "Scope & Closures",
        code: `function outer() {
            let x = 1;
            return function() {
              x++;
              console.log(x);
            }
          }
          const fn = outer();
          fn();
          fn();`,
        description:
          "How closures capture and maintain access to outer scope variables",
        group: "basic",
        difficulty: "beginner",
        expectedOutput: ["2", "3"],
        learningTips:
          "The inner function maintains a reference to x even after outer() has completed. Each call to fn() increments and logs the same x variable.",
      },

      // Group B: Event Loop, Tasks vs Microtasks
      {
        id: "3",
        title: "Task vs Microtask Basics",
        code: `console.log('start');
          setTimeout(() => console.log('timeout'), 0);
          Promise.resolve().then(() => console.log('promise'));
          console.log('end');`,
        description:
          "The fundamental difference between tasks (setTimeout) and microtasks (Promise)",
        group: "eventloop",
        difficulty: "beginner",
        expectedOutput: ["start", "end", "promise", "timeout"],
        learningTips:
          "Synchronous code runs first (start, end). Then ALL microtasks drain (promise), then ONE task executes (timeout). This is the core event loop behavior!",
      },
      {
        id: "4",
        title: "Promise.then Chaining and Error Handling",
        code: `Promise.resolve()
          .then(() => { 
            console.log('then1'); 
          })
          .then(() => { 
            throw new Error('err'); 
          })
          .catch(e => console.log('caught', e.message));`,
        description: "How Promise chains propagate values and handle errors",
        group: "eventloop",
        difficulty: "intermediate",
        expectedOutput: ["then1", "caught err"],
        learningTips:
          "Each .then() returns a new promise. When an error is thrown, execution jumps to the nearest .catch() handler.",
      },
      {
        id: "5",
        title: "Promise.all vs Promise.race",
        code: `const p1 = new Promise(r => setTimeout(() => r('p1'), 50));
          const p2 = Promise.resolve('p2');
          Promise.all([p1, p2]).then(console.log);
          Promise.race([p1, p2]).then(console.log);`,
        description:
          "Understanding how Promise.all waits for all while Promise.race settles with the first",
        group: "eventloop",
        difficulty: "intermediate",
        expectedOutput: ["p2", "['p1', 'p2']"],
        learningTips:
          "Promise.race settles immediately with p2 (already resolved). Promise.all waits for both, resolving with an array after 50ms.",
      },
      {
        id: "6",
        title: "Nested Promise Chain",
        code: `Promise.resolve()
          .then(() => Promise.resolve('inner'))
          .then(v => console.log('after inner', v));`,
        description: "How promises unwrap nested promises automatically",
        group: "eventloop",
        difficulty: "intermediate",
        expectedOutput: ["after inner inner"],
        learningTips:
          "When a .then() handler returns a Promise, the next .then() waits for that promise to resolve and receives its value.",
      },

      // Group C: Complex Asynchronous Scenarios
      {
        id: "7",
        title: "Microtask Priority Experiment",
        code: `console.log('S');
          setTimeout(() => console.log('T'), 0);
          Promise.resolve().then(() => {
            console.log('M1');
            return Promise.resolve();
          }).then(() => console.log('M2'));
          console.log('E');`,
        description:
          "Observing how microtasks always execute before tasks, even with nested promises",
        group: "complex",
        difficulty: "advanced",
        expectedOutput: ["S", "E", "M1", "M2", "T"],
        learningTips:
          "After sync code (S, E), the microtask queue drains completely (M1, M2) before any task from the task queue (T) runs.",
      },
      {
        id: "8",
        title: "async/await and Queue Interaction",
        code: `console.log('start');
          async function f() {
            await Promise.resolve();
            console.log('after await');
          }
          f();
          console.log('end');`,
        description: "How async/await interacts with the microtask queue",
        group: "complex",
        difficulty: "advanced",
        expectedOutput: ["start", "end", "after await"],
        learningTips:
          "The await keyword pauses function execution and schedules the continuation as a microtask. Sync code completes first, then microtasks run.",
      },
    ];

    exampleData.forEach((example) => {
      this.examples.set(example.id, example);
    });
  }

  async getAllExamples(): Promise<CodeExample[]> {
    return Array.from(this.examples.values());
  }

  async getExampleById(id: string): Promise<CodeExample | undefined> {
    return this.examples.get(id);
  }
}

export const storage = new MemStorage();

// Claude API는 한꺼번에 너무 많은 요청을 보내면 속도 제한에 걸려 재시도로 오히려 더 느려질
// 수 있다. 스토리지 업로드는 그대로 다 병렬로 두고, AI 호출만 동시 실행 개수를 제한해서
// 사진을 한 번에 많이 올릴 때도 안정적인 속도를 유지한다.
export function createLimiter(concurrency: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  function next() {
    if (active >= concurrency) return;
    const run = queue.shift();
    if (!run) return;
    active++;
    run();
  }

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
  };
}

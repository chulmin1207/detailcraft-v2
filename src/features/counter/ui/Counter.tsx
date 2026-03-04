import { useCounterStore } from '@/entities/counter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Counter() {
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Counter (Zustand)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <span className="text-4xl font-bold tabular-nums">{count}</span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={decrement}>-</Button>
          <Button variant="outline" onClick={reset}>Reset</Button>
          <Button variant="outline" onClick={increment}>+</Button>
        </div>
      </CardContent>
    </Card>
  );
}

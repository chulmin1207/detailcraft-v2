import { Counter } from '@/features/counter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function HomePage() {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">DetailCraft V2</h1>
        <p className="mt-2 text-muted-foreground">
          React + TypeScript + Vite + FSD Architecture
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Counter />
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Tech Stack</CardTitle>
            <CardDescription>This project uses</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>React + TypeScript</li>
              <li>Vite</li>
              <li>react-router-dom v7</li>
              <li>TanStack Query</li>
              <li>Zustand</li>
              <li>Axios</li>
              <li>shadcn/ui + Tailwind CSS</li>
              <li>FSD Architecture</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

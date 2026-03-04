import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AboutPage() {
  return (
    <div className="flex flex-col items-center gap-8">
      <h1 className="text-3xl font-bold tracking-tight">About</h1>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>FSD Architecture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Feature-Sliced Design (FSD) is an architectural methodology for frontend projects.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li><strong>app</strong> - Application initialization, providers, routing</li>
            <li><strong>pages</strong> - Full pages, composition of widgets/features</li>
            <li><strong>widgets</strong> - Large self-contained UI blocks</li>
            <li><strong>features</strong> - User interactions and actions</li>
            <li><strong>entities</strong> - Business entities and data models</li>
            <li><strong>shared</strong> - Reusable utilities, UI kit, API</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

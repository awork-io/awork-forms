import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Toaster } from "@/components/ui/toaster"

function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">awork Forms</CardTitle>
          <CardDescription>
            Create forms that connect to awork projects and tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground">
            Welcome to awork Forms. Sign in to get started.
          </p>
          <Button className="w-full">
            Sign in with awork
          </Button>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  )
}

export default App

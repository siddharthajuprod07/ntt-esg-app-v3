import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Plus,
  FileText,
  Calendar,
  Users,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  BarChart3
} from "lucide-react"

export default async function SurveysPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/auth/login")
  }

  // Mock data - replace with actual database query
  const surveys = [
    {
      id: "1",
      title: "Q4 2024 Environmental Impact Assessment",
      description: "Comprehensive assessment of our environmental footprint including carbon emissions, waste management, and resource efficiency.",
      category: "Environmental",
      status: "active",
      createdAt: new Date("2024-12-15"),
      responseCount: 45,
      completionRate: 78,
    },
    {
      id: "2",
      title: "Employee Wellbeing & Diversity Survey",
      description: "Annual survey to assess employee satisfaction, diversity metrics, and workplace culture.",
      category: "Social",
      status: "active",
      createdAt: new Date("2024-12-10"),
      responseCount: 38,
      completionRate: 65,
    },
    {
      id: "3",
      title: "Governance & Compliance Review",
      description: "Quarterly review of governance structures, compliance procedures, and risk management.",
      category: "Governance",
      status: "completed",
      createdAt: new Date("2024-11-28"),
      responseCount: 52,
      completionRate: 92,
    },
  ]

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Environmental":
        return "bg-green-100 text-green-700"
      case "Social":
        return "bg-blue-100 text-blue-700"
      case "Governance":
        return "bg-purple-100 text-purple-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700"
      case "draft":
        return "bg-yellow-100 text-yellow-700"
      case "completed":
        return "bg-gray-100 text-gray-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Surveys</h1>
          <p className="text-gray-600 mt-2">
            Create and manage your ESG assessment surveys
          </p>
        </div>
        <Link href="/surveys/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Survey
          </Button>
        </Link>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{surveys.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Surveys</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {surveys.filter(s => s.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {surveys.reduce((acc, s) => acc + s.responseCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(surveys.reduce((acc, s) => acc + s.completionRate, 0) / surveys.length)}%
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Surveys List */}
      <div className="grid gap-4">
        {surveys.map((survey) => (
          <Card key={survey.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{survey.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {survey.description}
                  </CardDescription>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge className={getCategoryColor(survey.category)} variant="secondary">
                      {survey.category}
                    </Badge>
                    <Badge className={getStatusColor(survey.status)} variant="secondary">
                      {survey.status}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {survey.createdAt.toLocaleDateString()}
                  </span>
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {survey.responseCount} responses
                  </span>
                  <span className="flex items-center">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    {survey.completionRate}% completion
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Results
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Empty State */}
      {surveys.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No surveys yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first ESG assessment survey to get started
            </p>
            <Link href="/surveys/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Survey
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
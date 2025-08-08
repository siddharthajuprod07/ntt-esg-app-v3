"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  Plus, 
  Trash2, 
  GripVertical,
  Save,
  ArrowLeft,
  FileText,
  Settings
} from "lucide-react"
import Link from "next/link"

const surveySchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(["Environmental", "Social", "Governance", "Custom"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

type SurveyFormData = z.infer<typeof surveySchema>

const categoryOptions = [
  { value: "Environmental", label: "Environmental", color: "bg-green-100 text-green-700" },
  { value: "Social", label: "Social", color: "bg-blue-100 text-blue-700" },
  { value: "Governance", label: "Governance", color: "bg-purple-100 text-purple-700" },
  { value: "Custom", label: "Custom", color: "bg-gray-100 text-gray-700" },
]

export default function CreateSurveyPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("Environmental")

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: "",
      description: "",
      category: "Environmental",
      startDate: "",
      endDate: "",
    },
  })

  const onSubmit = async (data: SurveyFormData) => {
    setIsLoading(true)
    try {
      // TODO: Implement API call to create survey
      console.log("Creating survey:", data)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Redirect to survey questions page
      router.push("/surveys")
    } catch (error) {
      console.error("Error creating survey:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link href="/surveys">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Surveys
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Survey</h1>
        <p className="text-gray-600 mt-2">
          Design your ESG assessment survey to gather sustainability insights
        </p>
      </div>
      {/* Survey Form */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Survey Details
            </CardTitle>
            <CardDescription>
              Provide basic information about your survey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Survey Title</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Q4 2024 Environmental Impact Assessment"
                          className="h-11"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Choose a clear, descriptive title for your survey
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          placeholder="Describe the purpose and scope of this survey..."
                          className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Explain what this survey aims to assess
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {categoryOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                field.onChange(option.value)
                                setSelectedCategory(option.value)
                              }}
                              className={`px-4 py-2 rounded-md border-2 transition-all ${
                                field.value === option.value
                                  ? "border-primary bg-primary/10"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              disabled={isLoading}
                            >
                              <Badge className={option.color} variant="secondary">
                                {option.label}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Select the ESG category this survey focuses on
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="date"
                            className="h-11"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormDescription>
                          When should this survey become active?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="date"
                            className="h-11"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormDescription>
                          When should this survey close?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Link href="/surveys">
                    <Button type="button" variant="outline" disabled={isLoading}>
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Create Survey
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Settings className="mr-2 h-5 w-5" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800 mb-3">
              After creating your survey, you'll be able to:
            </p>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex items-start">
                <Plus className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                Add multiple choice, rating, and yes/no questions
              </li>
              <li className="flex items-start">
                <GripVertical className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                Organize questions into sections
              </li>
              <li className="flex items-start">
                <Settings className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                Configure scoring weights and rules
              </li>
              <li className="flex items-start">
                <FileText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                Preview and test your survey before publishing
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Plus,
  Edit,
  Trash2,
  Settings,
  Weight,
  Building2,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Layers
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useSession } from "next-auth/react"
import Link from "next/link"

const variableSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  leverId: z.string().min(1, "Please select a lever"),
  weightage: z.coerce.number().min(0, "Weightage must be positive").default(1.0),
  description: z.string().optional(),
})

type VariableFormData = z.infer<typeof variableSchema>

interface Lever {
  id: string
  name: string
  pillar: {
    id: string
    name: string
  }
}

interface Variable {
  id: string
  name: string
  weightage: number
  description?: string
  isActive: boolean
  leverId: string
  createdAt: string
  updatedAt: string
  lever: {
    id: string
    name: string
    pillar: {
      id: string
      name: string
    }
  }
  _count: {
    questions: number
  }
}

export default function VariablesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedLeverId = searchParams.get('leverId')
  
  const [variables, setVariables] = useState<Variable[]>([])
  const [levers, setLevers] = useState<Lever[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const form = useForm<VariableFormData>({
    resolver: zodResolver(variableSchema),
    defaultValues: {
      name: "",
      leverId: selectedLeverId || "",
      weightage: 1.0,
      description: "",
    },
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
      return
    }
    
    if (session) {
      fetchData()
    }
  }, [session, status, router, selectedLeverId, showInactive])

  const fetchData = async () => {
    try {
      // Fetch levers
      const leversUrl = showInactive ? "/api/levers?includeInactive=true" : "/api/levers"
      const leversResponse = await fetch(leversUrl)
      if (leversResponse.ok) {
        const leversData = await leversResponse.json()
        setLevers(leversData)
      }

      // Fetch variables
      let variablesUrl = "/api/variables"
      const params = new URLSearchParams()
      if (selectedLeverId) params.append('leverId', selectedLeverId)
      if (showInactive) params.append('includeInactive', 'true')
      if (params.toString()) variablesUrl += '?' + params.toString()

      const variablesResponse = await fetch(variablesUrl)
      if (variablesResponse.ok) {
        const variablesData = await variablesResponse.json()
        setVariables(variablesData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: VariableFormData) => {
    setIsSubmitting(true)
    try {
      const url = editingVariable ? `/api/variables/${editingVariable.id}` : "/api/variables"
      const method = editingVariable ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await fetchData()
        setIsDialogOpen(false)
        setEditingVariable(null)
        form.reset()
      } else {
        const error = await response.json()
        console.error("Error saving variable:", error)
      }
    } catch (error) {
      console.error("Error saving variable:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (variable: Variable) => {
    try {
      const response = await fetch(`/api/variables/${variable.id}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !variable.isActive }),
      })

      if (response.ok) {
        await fetchData()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to toggle variable status")
      }
    } catch (error) {
      console.error("Error toggling variable:", error)
      alert("Failed to toggle variable status")
    }
  }

  const handleEdit = (variable: Variable) => {
    setEditingVariable(variable)
    form.reset({
      name: variable.name,
      leverId: variable.leverId,
      weightage: variable.weightage,
      description: variable.description || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (variable: Variable) => {
    if (!confirm("Are you sure you want to delete this variable?")) return

    try {
      const response = await fetch(`/api/variables/${variable.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchData()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete variable")
      }
    } catch (error) {
      console.error("Error deleting variable:", error)
      alert("Failed to delete variable")
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingVariable(null)
    form.reset()
  }

  const handleLeverChange = (leverId: string) => {
    if (leverId === "all") {
      router.push("/variables")
    } else {
      router.push(`/variables?leverId=${leverId}`)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  const canManageVariables = ["SUPER_ADMIN", "ORG_ADMIN", "SURVEY_CREATOR"].includes(session?.user?.role || "")
  const selectedLever = levers.find(l => l.id === selectedLeverId)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/levers">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Levers
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Variables Management
            {selectedLever && (
              <span className="text-xl font-normal text-gray-600 ml-2">
                - {selectedLever.name}
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-2">
            Manage variables under your ESG levers. Variables are measurable aspects within each lever.
          </p>
        </div>
        {canManageVariables && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingVariable(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Variable
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingVariable ? "Edit Variable" : "Create New Variable"}
                </DialogTitle>
                <DialogDescription>
                  {editingVariable 
                    ? "Update the variable information below."
                    : "Add a new variable to your ESG framework. Variables are measurable aspects that contain questions."
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="leverId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lever</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a lever" />
                            </SelectTrigger>
                            <SelectContent>
                              {levers.map((lever) => (
                                <SelectItem key={lever.id} value={lever.id}>
                                  {lever.pillar.name} - {lever.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Select the lever this variable belongs to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Variable Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Energy Consumption, Water Usage"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>
                          Choose a descriptive name for this variable
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weightage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weightage</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="1.0"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>
                          Relative weight of this variable in scoring (default: 1.0)
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
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <textarea
                            {...field}
                            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Describe what this variable measures..."
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDialogClose}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : editingVariable ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Select onValueChange={handleLeverChange} value={selectedLeverId || "all"}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Filter by lever" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levers</SelectItem>
              {levers.map((lever) => (
                <SelectItem key={lever.id} value={lever.id}>
                  {lever.pillar.name} - {lever.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={showInactive}
            onCheckedChange={setShowInactive}
            id="show-inactive-variables"
          />
          <label htmlFor="show-inactive-variables" className="text-sm font-medium">
            Show inactive variables
          </label>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variables</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{variables.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {variables.reduce((acc, variable) => acc + variable._count.questions, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Weightage</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {variables.length > 0 
                ? (variables.reduce((acc, variable) => acc + variable.weightage, 0) / variables.length).toFixed(1)
                : "0.0"
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variables Grid */}
      <div className="grid gap-4">
        {variables.map((variable) => (
          <Card key={variable.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{variable.name}</CardTitle>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Weight className="h-3 w-3" />
                      {variable.weightage}
                    </Badge>
                    <Badge 
                      variant={variable.isActive ? "default" : "secondary"}
                      className={`flex items-center gap-1 ${variable.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {variable.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {variable.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">
                      <Building2 className="h-3 w-3 mr-1" />
                      {variable.lever.pillar.name}
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-700">
                      <Layers className="h-3 w-3 mr-1" />
                      {variable.lever.name}
                    </Badge>
                  </div>
                  {variable.description && (
                    <CardDescription className="mt-2">
                      {variable.description}
                    </CardDescription>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      {variable._count.questions} questions
                    </span>
                    <span>
                      Created: {new Date(variable.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {canManageVariables && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={variable.isActive}
                        onCheckedChange={() => handleToggle(variable)}
                        size="sm"
                      />
                      <span className="text-sm text-gray-600">
                        {variable.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(variable)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(variable)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {variables.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No variables yet</h3>
            <p className="text-gray-600 mb-4">
              {selectedLever 
                ? `Create your first variable for ${selectedLever.name}`
                : "Create your first variable to define measurable aspects within your levers"
              }
            </p>
            {canManageVariables && levers.length > 0 && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Variable
              </Button>
            )}
            {levers.length === 0 && (
              <p className="text-sm text-gray-500">
                You need to create levers first before adding variables.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Permission Warning */}
      {!canManageVariables && (
        <Card className="border-amber-200 bg-amber-50/50 mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                You have read-only access. Contact an administrator to create or modify variables.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
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
  leverId: z.string().optional(),
  parentId: z.string().optional(),
  weightage: z.coerce.number().min(0, "Weightage must be positive").default(1.0),
  description: z.string().optional(),
  aggregationType: z.string().optional(),
}).refine((data) => data.leverId || data.parentId, {
  message: "Either a lever or parent variable must be selected",
  path: ["leverId"],
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
  leverId: string | null
  parentId: string | null
  level: number
  path?: string | null
  aggregationType?: string | null
  createdAt: string
  updatedAt: string
  lever?: {
    id: string
    name: string
    pillar: {
      id: string
      name: string
    }
  } | null
  parent?: {
    id: string
    name: string
    lever?: {
      id: string
      name: string
      pillar: {
        id: string
        name: string
      }
    } | null
  } | null
  _count: {
    questions: number
  }
}

// Helper functions to safely get pillar and lever info
const getVariablePillar = (variable: Variable) => {
  if (variable.lever?.pillar) {
    return variable.lever.pillar
  }
  if (variable.parent?.lever?.pillar) {
    return variable.parent.lever.pillar
  }
  return null
}

const getVariableLever = (variable: Variable) => {
  if (variable.lever) {
    return variable.lever
  }
  if (variable.parent?.lever) {
    return variable.parent.lever
  }
  return null
}

const getVariableDisplayInfo = (variable: Variable) => {
  const pillar = getVariablePillar(variable)
  const lever = getVariableLever(variable)
  
  let displayPath = variable.name
  if (variable.level > 0) {
    displayPath = variable.path || variable.name
  }
  
  return {
    pillar: pillar || { id: '', name: 'Unknown' },
    lever: lever || { id: '', name: 'Unknown' },
    displayPath,
    isHierarchical: variable.level > 0 || variable.parentId !== null
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
  const [parentType, setParentType] = useState<'lever' | 'variable'>('lever')
  const [deletePreview, setDeletePreview] = useState<any>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const form = useForm<VariableFormData>({
    resolver: zodResolver(variableSchema),
    defaultValues: {
      name: "",
      leverId: selectedLeverId || "",
      parentId: "",
      weightage: 1.0,
      description: "",
      aggregationType: "SUM",
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
      // Clean up the data based on parent type
      const submitData = {
        name: data.name,
        weightage: data.weightage,
        description: data.description,
        aggregationType: data.aggregationType,
        leverId: parentType === 'lever' ? data.leverId : undefined,
        parentId: parentType === 'variable' ? data.parentId : undefined,
      }

      const url = editingVariable ? `/api/variables/${editingVariable.id}` : "/api/variables"
      const method = editingVariable ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        await fetchData()
        setIsDialogOpen(false)
        setEditingVariable(null)
        setParentType('lever')
        form.reset()
      } else {
        const error = await response.json()
        console.error("Error saving variable:", error)
        alert(error.error || "Failed to save variable")
      }
    } catch (error) {
      console.error("Error saving variable:", error)
      alert("Failed to save variable")
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
    setParentType(variable.leverId ? 'lever' : 'variable')
    form.reset({
      name: variable.name,
      leverId: variable.leverId || "",
      parentId: variable.parentId || "",
      weightage: variable.weightage,
      description: variable.description || "",
      aggregationType: variable.aggregationType || "SUM",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (variable: Variable, forceHardDelete = false) => {
    try {
      const url = forceHardDelete 
        ? `/api/variables/${variable.id}?force=true`
        : `/api/variables/${variable.id}`
      
      const response = await fetch(url, {
        method: "DELETE",
      })

      if (response.ok) {
        const result = await response.json()
        
        switch (result.type) {
          case 'soft_delete':
            alert(`Variable "${variable.name}" has been deactivated. Click delete again to permanently remove it.`)
            await fetchData()
            break
            
          case 'delete_preview':
            setDeletePreview(result.preview)
            setShowDeleteDialog(true)
            break
            
          case 'hard_delete':
            alert(`Variable permanently deleted. ${result.deletedQuestions} questions removed, ${result.affectedResponses} responses affected, ${result.childrenReassigned} children reassigned.`)
            await fetchData()
            setDeletePreview(null)
            setShowDeleteDialog(false)
            break
            
          default:
            await fetchData()
        }
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete variable")
      }
    } catch (error) {
      console.error("Error deleting variable:", error)
      alert("Failed to delete variable")
    }
  }

  const handleConfirmHardDelete = () => {
    if (deletePreview) {
      handleDelete({ id: deletePreview.variable.id } as Variable, true)
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingVariable(null)
    setParentType('lever')
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
              <Button onClick={() => {
                setEditingVariable(null)
                setParentType('lever')
              }}>
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
                  {/* Parent Type Selection */}
                  <div className="space-y-2">
                    <FormLabel>Variable Type</FormLabel>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="parentType"
                          value="lever"
                          checked={parentType === 'lever'}
                          onChange={(e) => {
                            setParentType('lever')
                            form.setValue('parentId', '')
                          }}
                          disabled={isSubmitting}
                        />
                        <span>Root Variable (under lever)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="parentType"
                          value="variable"
                          checked={parentType === 'variable'}
                          onChange={(e) => {
                            setParentType('variable')
                            form.setValue('leverId', '')
                          }}
                          disabled={isSubmitting}
                        />
                        <span>Child Variable (under another variable)</span>
                      </label>
                    </div>
                  </div>

                  {/* Lever Selection (for root variables) */}
                  {parentType === 'lever' && (
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
                                    {lever.pillar?.name || 'Unknown'} - {lever.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            Select the lever this root variable belongs to
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Parent Variable Selection (for child variables) */}
                  {parentType === 'variable' && (
                    <FormField
                      control={form.control}
                      name="parentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent Variable</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={isSubmitting}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a parent variable" />
                              </SelectTrigger>
                              <SelectContent>
                                {variables.map((variable) => {
                                  const displayInfo = getVariableDisplayInfo(variable)
                                  return (
                                    <SelectItem key={variable.id} value={variable.id}>
                                      {displayInfo.displayPath} ({displayInfo.pillar.name})
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            Select the parent variable this child variable belongs to
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
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
                    name="aggregationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aggregation Type</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select aggregation type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SUM">Sum - Add all child values</SelectItem>
                              <SelectItem value="AVERAGE">Average - Mean of all child values</SelectItem>
                              <SelectItem value="WEIGHTED_AVERAGE">Weighted Average - Child values weighted by their weightage</SelectItem>
                              <SelectItem value="MAX">Maximum - Highest child value</SelectItem>
                              <SelectItem value="MIN">Minimum - Lowest child value</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          How child variable scores should be combined (only relevant if this variable will have children)
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
                  {lever.pillar?.name || 'Unknown'} - {lever.name}
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
        {variables.map((variable) => {
          const displayInfo = getVariableDisplayInfo(variable)
          return (
            <Card key={variable.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">
                        {displayInfo.isHierarchical ? displayInfo.displayPath : variable.name}
                      </CardTitle>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Weight className="h-3 w-3" />
                        {variable.weightage}
                      </Badge>
                      {variable.level > 0 && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          L{variable.level}
                        </Badge>
                      )}
                      {variable.aggregationType && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          {variable.aggregationType}
                        </Badge>
                      )}
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
                        {displayInfo.pillar.name}
                      </Badge>
                      <Badge className="bg-purple-100 text-purple-700">
                        <Layers className="h-3 w-3 mr-1" />
                        {displayInfo.lever.name}
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
          )
        })}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Confirm Permanent Deletion
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The following will be permanently deleted:
            </DialogDescription>
          </DialogHeader>
          
          {deletePreview && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Variable to Delete:</h4>
                <div className="text-sm flex items-center gap-2">
                  <strong>{deletePreview.variable.name}</strong>
                  {deletePreview.variable.level > 0 && (
                    <Badge variant="outline">
                      L{deletePreview.variable.level}
                    </Badge>
                  )}
                </div>
              </div>

              {deletePreview.totalQuestions > 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Questions ({deletePreview.totalQuestions})
                  </h4>
                  <div className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                    {deletePreview.questionsToDelete.map((question: any) => (
                      <div key={question.id} className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-red-100 px-1 rounded">
                          {question.type}
                        </span>
                        <span className="truncate">{question.text}</span>
                        {question.required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deletePreview.totalChildren > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Child Variables ({deletePreview.totalChildren})
                  </h4>
                  <p className="text-sm text-blue-700 mb-2">
                    These child variables will be reassigned to the parent level:
                  </p>
                  <div className="text-sm text-blue-700 space-y-1 max-h-32 overflow-y-auto">
                    {deletePreview.childrenToReassign.map((child: any) => (
                      <div key={child.id} className="flex items-center gap-2">
                        <span className="font-medium">{child.name}</span>
                        <span className="text-xs text-blue-600">
                          ({child._count.questions} questions)
                        </span>
                        {!child.isActive && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deletePreview.affectedResponseCount > 0 && (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Survey Responses
                  </h4>
                  <p className="text-sm text-orange-700">
                    <strong>{deletePreview.affectedResponseCount}</strong> survey responses 
                    contain answers to questions from this variable. These answers will be permanently removed.
                  </p>
                </div>
              )}

              {deletePreview.totalQuestions === 0 && deletePreview.totalChildren === 0 && deletePreview.affectedResponseCount === 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700">
                    This variable has no questions, children, or associated responses. 
                    Deletion will have no impact on existing data.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeletePreview(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmHardDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
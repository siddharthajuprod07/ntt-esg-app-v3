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
  EyeOff
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

const leverSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  pillarId: z.string().min(1, "Please select a pillar"),
  weightage: z.coerce.number().min(0, "Weightage must be positive").default(1.0),
  description: z.string().optional(),
})

type LeverFormData = z.infer<typeof leverSchema>

interface Pillar {
  id: string
  name: string
}

interface Lever {
  id: string
  name: string
  weightage: number
  description?: string
  isActive: boolean
  pillarId: string
  createdAt: string
  updatedAt: string
  pillar: {
    id: string
    name: string
  }
  _count: {
    variables: number
  }
}

export default function LeversPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedPillarId = searchParams.get('pillarId')
  
  const [levers, setLevers] = useState<Lever[]>([])
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLever, setEditingLever] = useState<Lever | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const form = useForm<LeverFormData>({
    resolver: zodResolver(leverSchema),
    defaultValues: {
      name: "",
      pillarId: selectedPillarId || "",
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
  }, [session, status, router, selectedPillarId, showInactive])

  const fetchData = async () => {
    try {
      // Fetch pillars
      const pillarsUrl = showInactive ? "/api/pillars?includeInactive=true" : "/api/pillars"
      const pillarsResponse = await fetch(pillarsUrl)
      if (pillarsResponse.ok) {
        const pillarsData = await pillarsResponse.json()
        setPillars(pillarsData)
      }

      // Fetch levers
      let leversUrl = "/api/levers"
      const params = new URLSearchParams()
      if (selectedPillarId) params.append('pillarId', selectedPillarId)
      if (showInactive) params.append('includeInactive', 'true')
      if (params.toString()) leversUrl += '?' + params.toString()

      const leversResponse = await fetch(leversUrl)
      if (leversResponse.ok) {
        const leversData = await leversResponse.json()
        setLevers(leversData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: LeverFormData) => {
    setIsSubmitting(true)
    try {
      const url = editingLever ? `/api/levers/${editingLever.id}` : "/api/levers"
      const method = editingLever ? "PUT" : "POST"
      
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
        setEditingLever(null)
        form.reset()
      } else {
        const error = await response.json()
        console.error("Error saving lever:", error)
      }
    } catch (error) {
      console.error("Error saving lever:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (lever: Lever) => {
    try {
      const response = await fetch(`/api/levers/${lever.id}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !lever.isActive }),
      })

      if (response.ok) {
        await fetchData()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to toggle lever status")
      }
    } catch (error) {
      console.error("Error toggling lever:", error)
      alert("Failed to toggle lever status")
    }
  }

  const handleEdit = (lever: Lever) => {
    setEditingLever(lever)
    form.reset({
      name: lever.name,
      pillarId: lever.pillarId,
      weightage: lever.weightage,
      description: lever.description || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (lever: Lever) => {
    if (!confirm("Are you sure you want to delete this lever?")) return

    try {
      const response = await fetch(`/api/levers/${lever.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchData()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete lever")
      }
    } catch (error) {
      console.error("Error deleting lever:", error)
      alert("Failed to delete lever")
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingLever(null)
    form.reset()
  }

  const handlePillarChange = (pillarId: string) => {
    if (pillarId === "all") {
      router.push("/levers")
    } else {
      router.push(`/levers?pillarId=${pillarId}`)
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

  const canManageLevers = ["SUPER_ADMIN", "ORG_ADMIN", "SURVEY_CREATOR"].includes(session?.user?.role || "")
  const selectedPillar = pillars.find(p => p.id === selectedPillarId)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/pillars">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Pillars
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Levers Management
            {selectedPillar && (
              <span className="text-xl font-normal text-gray-600 ml-2">
                - {selectedPillar.name}
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-2">
            Manage levers under your ESG pillars. Levers are the main action areas within each pillar.
          </p>
        </div>
        {canManageLevers && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingLever(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Lever
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingLever ? "Edit Lever" : "Create New Lever"}
                </DialogTitle>
                <DialogDescription>
                  {editingLever 
                    ? "Update the lever information below."
                    : "Add a new lever to your ESG framework. Levers are action areas within pillars that contain variables."
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="pillarId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pillar</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a pillar" />
                            </SelectTrigger>
                            <SelectContent>
                              {pillars.map((pillar) => (
                                <SelectItem key={pillar.id} value={pillar.id}>
                                  {pillar.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Select the pillar this lever belongs to
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
                        <FormLabel>Lever Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Energy Management, Waste Reduction"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>
                          Choose a descriptive name for this lever
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
                          Relative weight of this lever in scoring (default: 1.0)
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
                            placeholder="Describe what this lever covers..."
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
                      {isSubmitting ? "Saving..." : editingLever ? "Update" : "Create"}
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
          <Select onValueChange={handlePillarChange} value={selectedPillarId || "all"}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by pillar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pillars</SelectItem>
              {pillars.map((pillar) => (
                <SelectItem key={pillar.id} value={pillar.id}>
                  {pillar.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={showInactive}
            onCheckedChange={setShowInactive}
            id="show-inactive-levers"
          />
          <label htmlFor="show-inactive-levers" className="text-sm font-medium">
            Show inactive levers
          </label>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Levers</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{levers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variables</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {levers.reduce((acc, lever) => acc + lever._count.variables, 0)}
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
              {levers.length > 0 
                ? (levers.reduce((acc, lever) => acc + lever.weightage, 0) / levers.length).toFixed(1)
                : "0.0"
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Levers Grid */}
      <div className="grid gap-4">
        {levers.map((lever) => (
          <Card key={lever.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{lever.name}</CardTitle>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Weight className="h-3 w-3" />
                      {lever.weightage}
                    </Badge>
                    <Badge 
                      variant={lever.isActive ? "default" : "secondary"}
                      className={`flex items-center gap-1 ${lever.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {lever.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {lever.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">
                      <Building2 className="h-3 w-3 mr-1" />
                      {lever.pillar.name}
                    </Badge>
                  </div>
                  {lever.description && (
                    <CardDescription className="mt-2">
                      {lever.description}
                    </CardDescription>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      {lever._count.variables} variables
                    </span>
                    <span>
                      Created: {new Date(lever.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {canManageLevers && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={lever.isActive}
                        onCheckedChange={() => handleToggle(lever)}
                        size="sm"
                      />
                      <span className="text-sm text-gray-600">
                        {lever.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(lever)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(lever)}
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
      {levers.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No levers yet</h3>
            <p className="text-gray-600 mb-4">
              {selectedPillar 
                ? `Create your first lever for ${selectedPillar.name}`
                : "Create your first lever to define action areas within your pillars"
              }
            </p>
            {canManageLevers && pillars.length > 0 && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Lever
              </Button>
            )}
            {pillars.length === 0 && (
              <p className="text-sm text-gray-500">
                You need to create pillars first before adding levers.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Permission Warning */}
      {!canManageLevers && (
        <Card className="border-amber-200 bg-amber-50/50 mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                You have read-only access. Contact an administrator to create or modify levers.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
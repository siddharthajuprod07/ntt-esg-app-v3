"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Plus,
  Edit,
  Trash2,
  Building2,
  Weight,
  Settings,
  AlertCircle,
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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { redirect } from "next/navigation"

const pillarSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  weightage: z.coerce.number().min(0, "Weightage must be positive").default(1.0),
  description: z.string().optional(),
})

type PillarFormData = z.infer<typeof pillarSchema>

interface Pillar {
  id: string
  name: string
  weightage: number
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    levers: number
  }
}

export default function PillarsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPillar, setEditingPillar] = useState<Pillar | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const form = useForm<PillarFormData>({
    resolver: zodResolver(pillarSchema),
    defaultValues: {
      name: "",
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
      fetchPillars()
    }
  }, [session, status, router, showInactive])

  const fetchPillars = async () => {
    try {
      const url = showInactive ? "/api/pillars?includeInactive=true" : "/api/pillars"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setPillars(data)
      } else {
        console.error("Failed to fetch pillars")
      }
    } catch (error) {
      console.error("Error fetching pillars:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: PillarFormData) => {
    setIsSubmitting(true)
    try {
      const url = editingPillar ? `/api/pillars/${editingPillar.id}` : "/api/pillars"
      const method = editingPillar ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await fetchPillars()
        setIsDialogOpen(false)
        setEditingPillar(null)
        form.reset()
      } else {
        const error = await response.json()
        console.error("Error saving pillar:", error)
        // You could show a toast notification here
      }
    } catch (error) {
      console.error("Error saving pillar:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (pillar: Pillar) => {
    setEditingPillar(pillar)
    form.reset({
      name: pillar.name,
      weightage: pillar.weightage,
      description: pillar.description || "",
    })
    setIsDialogOpen(true)
  }

  const handleToggle = async (pillar: Pillar) => {
    try {
      const response = await fetch(`/api/pillars/${pillar.id}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !pillar.isActive }),
      })

      if (response.ok) {
        await fetchPillars()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to toggle pillar status")
      }
    } catch (error) {
      console.error("Error toggling pillar:", error)
      alert("Failed to toggle pillar status")
    }
  }

  const handleDelete = async (pillar: Pillar) => {
    if (!confirm("Are you sure you want to delete this pillar?")) return

    try {
      const response = await fetch(`/api/pillars/${pillar.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchPillars()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete pillar")
      }
    } catch (error) {
      console.error("Error deleting pillar:", error)
      alert("Failed to delete pillar")
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingPillar(null)
    form.reset()
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

  const canManagePillars = ["SUPER_ADMIN", "ORG_ADMIN", "SURVEY_CREATOR"].includes(session?.user?.role || "")

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pillars Management</h1>
          <p className="text-gray-600 mt-2">
            Manage the foundational pillars for your ESG assessment framework
          </p>
        </div>
        {canManagePillars && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingPillar(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Pillar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingPillar ? "Edit Pillar" : "Create New Pillar"}
                </DialogTitle>
                <DialogDescription>
                  {editingPillar 
                    ? "Update the pillar information below."
                    : "Add a new pillar to your ESG framework. Pillars are the main categories that contain levers and variables."
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pillar Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Environmental, Social, Governance"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>
                          Choose a unique name for this pillar
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
                          Relative weight of this pillar in scoring (default: 1.0)
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
                            placeholder="Describe what this pillar encompasses..."
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
                      {isSubmitting ? "Saving..." : editingPillar ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex justify-end items-center mb-6">
        <div className="flex items-center space-x-2">
          <Switch
            checked={showInactive}
            onCheckedChange={setShowInactive}
            id="show-inactive"
          />
          <label htmlFor="show-inactive" className="text-sm font-medium">
            Show inactive pillars
          </label>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pillars</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pillars.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Levers</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pillars.reduce((acc, pillar) => acc + pillar._count.levers, 0)}
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
              {pillars.length > 0 
                ? (pillars.reduce((acc, pillar) => acc + pillar.weightage, 0) / pillars.length).toFixed(1)
                : "0.0"
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pillars Grid */}
      <div className="grid gap-4">
        {pillars.map((pillar) => (
          <Card key={pillar.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{pillar.name}</CardTitle>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Weight className="h-3 w-3" />
                      {pillar.weightage}
                    </Badge>
                    <Badge 
                      variant={pillar.isActive ? "default" : "secondary"}
                      className={`flex items-center gap-1 ${pillar.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {pillar.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {pillar.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {pillar.description && (
                    <CardDescription className="mt-2">
                      {pillar.description}
                    </CardDescription>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      {pillar._count.levers} levers
                    </span>
                    <span>
                      Created: {new Date(pillar.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {canManagePillars && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={pillar.isActive}
                        onCheckedChange={() => handleToggle(pillar)}
                        size="sm"
                      />
                      <span className="text-sm text-gray-600">
                        {pillar.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(pillar)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(pillar)}
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
      {pillars.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pillars yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first pillar to start building your ESG assessment framework
            </p>
            {canManagePillars && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Pillar
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Permission Warning */}
      {!canManagePillars && (
        <Card className="border-amber-200 bg-amber-50/50 mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                You have read-only access. Contact an administrator to create or modify pillars.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Play, Users, FileText, Calendar, Settings } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Survey {
  id: string;
  title: string;
  description?: string;
  category: string;
  isActive: boolean;
  isPublished: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    questions: number;
    responses: number;
    completedResponses?: number;
    draftResponses?: number;
  };
}

export default function SurveysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    
    if (session) {
      fetchSurveys();
    }
  }, [session, status, router]);

  const fetchSurveys = async () => {
    try {
      const response = await fetch('/api/surveys');
      if (response.ok) {
        const data = await response.json();
        setSurveys(data);
      }
    } catch (error) {
      console.error('Error fetching surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToggle = async (survey: Survey) => {
    try {
      const response = await fetch(`/api/surveys/${survey.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !survey.isPublished })
      });

      if (response.ok) {
        fetchSurveys();
        toast({
          title: survey.isPublished ? 'Survey Unpublished' : 'Survey Published',
          description: `Survey has been ${survey.isPublished ? 'unpublished' : 'published'} successfully.`
        });
      }
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update survey status.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (surveyId: string) => {
    if (!confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchSurveys();
        toast({
          title: 'Survey Deleted',
          description: 'Survey has been deleted successfully.'
        });
      }
    } catch (error) {
      console.error('Error deleting survey:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete survey.',
        variant: 'destructive'
      });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const canManageSurveys = ['SUPER_ADMIN', 'ORG_ADMIN', 'SURVEY_CREATOR'].includes(session?.user?.role || '');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Surveys Management</h1>
          <p className="text-gray-600 mt-2">Create and manage ESG assessment surveys</p>
        </div>
        {canManageSurveys && (
          <Button onClick={() => router.push('/surveys/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Survey
          </Button>
        )}
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
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {surveys.filter(s => s.isPublished).length}
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
              {surveys.reduce((total, survey) => total + (survey._count.completedResponses ?? survey._count.responses), 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +{surveys.reduce((total, survey) => total + (survey._count.draftResponses ?? 0), 0)} drafts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Questions</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {surveys.length > 0 
                ? Math.round(surveys.reduce((total, survey) => total + survey._count.questions, 0) / surveys.length)
                : 0
              }
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Surveys Grid */}
      <div className="grid gap-4">
        {surveys.map((survey) => (
          <Card key={survey.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{survey.title}</CardTitle>
                    <Badge variant={survey.category === 'Environmental' ? 'default' : 
                                 survey.category === 'Social' ? 'secondary' : 'outline'}>
                      {survey.category}
                    </Badge>
                    <Badge variant={survey.isPublished ? 'default' : 'secondary'}>
                      {survey.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                    {!survey.isActive && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                  
                  {survey.description && (
                    <CardDescription className="mt-2">
                      {survey.description}
                    </CardDescription>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {survey._count.questions} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {survey._count.completedResponses ?? survey._count.responses} completed
                      {survey._count.draftResponses && survey._count.draftResponses > 0 && 
                        ` • ${survey._count.draftResponses} drafts`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created: {new Date(survey.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Created by: {survey.createdBy.name}
                  </div>
                </div>
                
                {canManageSurveys && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/surveys/${survey.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      
                      <Button
                        variant={survey.isPublished ? 'secondary' : 'default'}
                        size="sm"
                        onClick={() => handlePublishToggle(survey)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        {survey.isPublished ? 'Unpublish' : 'Publish'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(survey.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {survey.isPublished && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/surveys/${survey.id}/take`)}
                        className="w-full"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Take Survey
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/surveys/${survey.id}/responses`)}
                      className="w-full"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      View Responses
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
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
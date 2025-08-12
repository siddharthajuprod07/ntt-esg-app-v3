'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, X, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Pillar {
  id: string;
  name: string;
  description?: string;
}

interface Lever {
  id: string;
  name: string;
  pillarId: string;
  description?: string;
}

interface Variable {
  id: string;
  name: string;
  leverId?: string;
  parentId?: string;
  level: number;
  description?: string;
  _count?: {
    questions: number;
  };
}

interface Question {
  id: string;
  text: string;
  type: string;
  required: boolean;
  weightage: number;
  variableId: string;
  variable: {
    name: string;
    lever?: {
      name: string;
      pillar: {
        name: string;
      };
    };
  };
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  category: string;
  startDate?: string;
  endDate?: string;
  allowAnonymous: boolean;
  maxResponses?: number;
  isPublished: boolean;
  selectedPillars?: string[];
  selectedLevers?: string[];
  selectedVariables?: string[];
  questions: Array<{
    id: string;
    text: string;
    type: string;
    required: boolean;
    weight: number;
    order: number;
    variableQuestion: {
      id: string;
      variable: {
        name: string;
        lever?: {
          name: string;
          pillar: {
            name: string;
          };
        };
      };
    };
  }>;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    questions: number;
    responses: number;
  };
}

export default function EditSurveyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const surveyId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [levers, setLevers] = useState<Lever[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    startDate: '',
    endDate: '',
    allowAnonymous: false,
    maxResponses: ''
  });

  const [selectedPillars, setSelectedPillars] = useState<string[]>([]);
  const [selectedLevers, setSelectedLevers] = useState<string[]>([]);
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [questionPreview, setQuestionPreview] = useState<number>(0);
  
  // Question selection state
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showQuestionSelection, setShowQuestionSelection] = useState(false);

  // Load initial data
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    
    if (session) {
      const canEdit = ['SUPER_ADMIN', 'ORG_ADMIN', 'SURVEY_CREATOR'].includes(session.user?.role || '');
      if (!canEdit) {
        router.push('/surveys');
        return;
      }
      fetchInitialData();
    }
  }, [session, status, router, surveyId]);

  const fetchInitialData = async () => {
    setDataLoading(true);
    try {
      const [surveyRes, pillarsRes, leversRes, variablesRes] = await Promise.all([
        fetch(`/api/surveys/${surveyId}`),
        fetch('/api/pillars'),
        fetch('/api/levers'),
        fetch('/api/variables')
      ]);

      if (!surveyRes.ok) {
        throw new Error('Survey not found');
      }

      const surveyData = await surveyRes.json();
      setSurvey(surveyData);
      
      // Pre-populate form data
      setFormData({
        title: surveyData.title || '',
        description: surveyData.description || '',
        category: surveyData.category || '',
        startDate: surveyData.startDate ? new Date(surveyData.startDate).toISOString().slice(0, 16) : '',
        endDate: surveyData.endDate ? new Date(surveyData.endDate).toISOString().slice(0, 16) : '',
        allowAnonymous: surveyData.allowAnonymous || false,
        maxResponses: surveyData.maxResponses?.toString() || ''
      });

      // Pre-populate selections
      setSelectedPillars(surveyData.selectedPillars || []);
      setSelectedLevers(surveyData.selectedLevers || []);
      setSelectedVariables(surveyData.selectedVariables || []);
      
      // Pre-populate selected questions
      const existingQuestionIds = surveyData.questions.map((q: any) => q.variableQuestion.id);
      setSelectedQuestions(existingQuestionIds);
      setQuestionPreview(existingQuestionIds.length);

      if (pillarsRes.ok) {
        const pillarsData = await pillarsRes.json();
        setPillars(pillarsData);
      }

      if (leversRes.ok) {
        const leversData = await leversRes.json();
        setLevers(leversData);
      }

      if (variablesRes.ok) {
        const variablesData = await variablesRes.json();
        setVariables(variablesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load survey data',
        variant: 'destructive'
      });
      router.push('/surveys');
    } finally {
      setDataLoading(false);
    }
  };

  // Load available questions based on selections
  const loadAvailableQuestions = async (pillars: string[], levers: string[], variables: string[]) => {
    if (pillars.length === 0 && levers.length === 0 && variables.length === 0) {
      setAvailableQuestions([]);
      setSelectedQuestions([]);
      setShowQuestionSelection(false);
      return;
    }

    setQuestionsLoading(true);
    try {
      const params = new URLSearchParams();
      if (variables.length > 0) {
        params.append('variables', variables.join(','));
      } else if (levers.length > 0) {
        params.append('levers', levers.join(','));
      } else if (pillars.length > 0) {
        params.append('pillars', pillars.join(','));
      }

      const response = await fetch(`/api/questions?${params}`);
      if (response.ok) {
        const questions = await response.json();
        setAvailableQuestions(questions);
        setShowQuestionSelection(questions.length > 0);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setAvailableQuestions([]);
      setShowQuestionSelection(false);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handlePillarToggle = (pillarId: string) => {
    const newSelected = selectedPillars.includes(pillarId)
      ? selectedPillars.filter(id => id !== pillarId)
      : [...selectedPillars, pillarId];
    
    setSelectedPillars(newSelected);
    setSelectedLevers([]); // Clear dependent selections
    setSelectedVariables([]);
    setAvailableQuestions([]);
    setSelectedQuestions([]);
    setShowQuestionSelection(false);
    setQuestionPreview(0);
  };

  const handleLeverToggle = (leverId: string) => {
    const newSelected = selectedLevers.includes(leverId)
      ? selectedLevers.filter(id => id !== leverId)
      : [...selectedLevers, leverId];
    
    setSelectedLevers(newSelected);
    setSelectedVariables([]); // Clear dependent selections
    setAvailableQuestions([]);
    setSelectedQuestions([]);
    setShowQuestionSelection(false);
    setQuestionPreview(0);
  };

  const handleVariableToggle = (variableId: string) => {
    const newSelected = selectedVariables.includes(variableId)
      ? selectedVariables.filter(id => id !== variableId)
      : [...selectedVariables, variableId];
    
    setSelectedVariables(newSelected);
    setAvailableQuestions([]);
    setSelectedQuestions([]);
    setShowQuestionSelection(false);
    setQuestionPreview(0);
  };

  const handleLoadQuestions = () => {
    loadAvailableQuestions(selectedPillars, selectedLevers, selectedVariables);
  };

  // Filter functions
  const getFilteredLevers = () => {
    if (selectedPillars.length === 0) return levers;
    return levers.filter(lever => selectedPillars.includes(lever.pillarId));
  };

  const getFilteredVariables = () => {
    if (selectedLevers.length === 0 && selectedPillars.length === 0) {
      return variables;
    }
    
    if (selectedLevers.length > 0) {
      // Get all variables under selected levers, including hierarchical children
      return variables.filter(variable => {
        if (variable.leverId && selectedLevers.includes(variable.leverId)) {
          return true; // Direct child of selected lever
        }
        
        // Check if it's a hierarchical child of a variable under selected lever
        let current = variable;
        while (current.parentId) {
          const parent = variables.find(v => v.id === current.parentId);
          if (!parent) break;
          if (parent.leverId && selectedLevers.includes(parent.leverId)) {
            return true; // Child of a variable under selected lever
          }
          current = parent;
        }
        
        return false;
      });
    }
    
    if (selectedPillars.length > 0) {
      const relevantLeverIds = levers
        .filter(lever => selectedPillars.includes(lever.pillarId))
        .map(lever => lever.id);
      
      // Get all variables under relevant levers, including hierarchical children
      return variables.filter(variable => {
        if (variable.leverId && relevantLeverIds.includes(variable.leverId)) {
          return true; // Direct child of relevant lever
        }
        
        // Check if it's a hierarchical child of a variable under relevant lever
        let current = variable;
        while (current.parentId) {
          const parent = variables.find(v => v.id === current.parentId);
          if (!parent) break;
          if (parent.leverId && relevantLeverIds.includes(parent.leverId)) {
            return true; // Child of a variable under relevant lever
          }
          current = parent;
        }
        
        return false;
      });
    }
    
    return variables;
  };

  // Question selection handlers
  const handleQuestionToggle = (questionId: string) => {
    const newSelected = selectedQuestions.includes(questionId)
      ? selectedQuestions.filter(id => id !== questionId)
      : [...selectedQuestions, questionId];
    
    setSelectedQuestions(newSelected);
    setQuestionPreview(newSelected.length);
  };

  const handleSelectAllQuestions = () => {
    const allIds = availableQuestions.map(q => q.id);
    setSelectedQuestions(allIds);
    setQuestionPreview(allIds.length);
  };

  const handleDeselectAllQuestions = () => {
    setSelectedQuestions([]);
    setQuestionPreview(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.category) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (selectedQuestions.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one question for the survey',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          maxResponses: formData.maxResponses ? parseInt(formData.maxResponses) : undefined,
          selectedQuestions: selectedQuestions,
          selectedPillars: selectedPillars.length > 0 ? selectedPillars : undefined,
          selectedLevers: selectedLevers.length > 0 ? selectedLevers : undefined,
          selectedVariables: selectedVariables.length > 0 ? selectedVariables : undefined
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Survey updated successfully'
        });
        router.push(`/surveys`);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update survey');
      }
    } catch (error) {
      console.error('Error updating survey:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update survey',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || dataLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !survey) {
    return null;
  }

  const hasResponses = (survey._count?.responses || 0) > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/surveys">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Surveys
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Edit Survey</h1>
          <p className="text-gray-600 mt-2">Update your ESG assessment survey</p>
        </div>
        <div className="text-sm text-gray-500">
          <div>Created by: {survey.createdBy.name}</div>
          <div>{survey._count?.responses || 0} responses received</div>
        </div>
      </div>

      {hasResponses && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <p className="font-medium">
                Warning: This survey has {survey._count?.responses || 0} responses. 
                Changes to questions may affect existing response data.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Update the basic details of your survey
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Survey Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                placeholder="Enter survey title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                placeholder="Describe the purpose and scope of this survey"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({...prev, category: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Environmental">Environmental</SelectItem>
                    <SelectItem value="Social">Social</SelectItem>
                    <SelectItem value="Governance">Governance</SelectItem>
                    <SelectItem value="Integrated">Integrated ESG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="maxResponses">Max Responses</Label>
                <Input
                  id="maxResponses"
                  type="number"
                  value={formData.maxResponses}
                  onChange={(e) => setFormData(prev => ({...prev, maxResponses: e.target.value}))}
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({...prev, startDate: e.target.value}))}
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({...prev, endDate: e.target.value}))}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowAnonymous"
                checked={formData.allowAnonymous}
                onCheckedChange={(checked) => setFormData(prev => ({...prev, allowAnonymous: checked as boolean}))}
              />
              <Label htmlFor="allowAnonymous">Allow anonymous responses</Label>
            </div>
          </CardContent>
        </Card>

        {/* Question Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Question Selection</CardTitle>
            <CardDescription>
              Choose pillars, levers, or specific variables to include questions from
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Preview and Load Button */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    {questionPreview} questions will be included in this survey
                  </span>
                </div>
                {(selectedPillars.length > 0 || selectedLevers.length > 0 || selectedVariables.length > 0) && !showQuestionSelection && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLoadQuestions}
                    disabled={questionsLoading}
                  >
                    {questionsLoading ? 'Loading...' : 'Load Questions'}
                  </Button>
                )}
              </div>
            </div>

            {/* Pillars Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Pillars</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pillars.map((pillar) => (
                  <Card 
                    key={pillar.id} 
                    className={`cursor-pointer transition-all ${
                      selectedPillars.includes(pillar.id) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => handlePillarToggle(pillar.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedPillars.includes(pillar.id)}
                          onCheckedChange={() => handlePillarToggle(pillar.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{pillar.name}</h4>
                          {pillar.description && (
                            <p className="text-sm text-gray-600 mt-1">{pillar.description}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {selectedPillars.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Selected pillars:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPillars.map((pillarId) => {
                      const pillar = pillars.find(p => p.id === pillarId);
                      return pillar ? (
                        <Badge key={pillarId} variant="default" className="gap-1">
                          {pillar.name}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePillarToggle(pillarId);
                            }}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Levers Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Levers</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {getFilteredLevers().map((lever) => (
                  <Card 
                    key={lever.id} 
                    className={`cursor-pointer transition-all ${
                      selectedLevers.includes(lever.id) 
                        ? 'border-green-500 bg-green-50' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => handleLeverToggle(lever.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedLevers.includes(lever.id)}
                          onCheckedChange={() => handleLeverToggle(lever.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{lever.name}</h4>
                          <p className="text-xs text-gray-500">
                            {pillars.find(p => p.id === lever.pillarId)?.name}
                          </p>
                          {lever.description && (
                            <p className="text-sm text-gray-600 mt-1">{lever.description}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {selectedLevers.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Selected levers:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedLevers.map((leverId) => {
                      const lever = levers.find(l => l.id === leverId);
                      return lever ? (
                        <Badge key={leverId} variant="secondary" className="gap-1">
                          {lever.name}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeverToggle(leverId);
                            }}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Variables Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Variables</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {getFilteredVariables().map((variable) => (
                  <Card 
                    key={variable.id} 
                    className={`cursor-pointer transition-all ${
                      selectedVariables.includes(variable.id) 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => handleVariableToggle(variable.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedVariables.includes(variable.id)}
                          onCheckedChange={() => handleVariableToggle(variable.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm" style={{ marginLeft: `${variable.level * 16}px` }}>
                            {variable.name}
                          </h4>
                          <div className="text-xs text-gray-500 mt-1">
                            {variable._count?.questions ? `${variable._count.questions} questions` : '0 questions'}
                          </div>
                          {variable.description && (
                            <p className="text-sm text-gray-600 mt-1">{variable.description}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {selectedVariables.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Selected variables:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVariables.map((variableId) => {
                      const variable = variables.find(v => v.id === variableId);
                      return variable ? (
                        <Badge key={variableId} variant="outline" className="gap-1">
                          {variable.name}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVariableToggle(variableId);
                            }}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Individual Question Selection */}
        {showQuestionSelection && (
          <Card>
            <CardHeader>
              <CardTitle>Select Specific Questions</CardTitle>
              <CardDescription>
                Choose which questions to include in your survey from the selected variables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questionsLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading questions...</div>
                </div>
              ) : (
                <>
                  {/* Question Selection Controls */}
                  <div className="flex justify-between items-center pb-4 border-b">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">
                        {selectedQuestions.length} of {availableQuestions.length} questions selected
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllQuestions}
                        disabled={selectedQuestions.length === availableQuestions.length}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAllQuestions}
                        disabled={selectedQuestions.length === 0}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {availableQuestions.map((question, index) => (
                      <Card 
                        key={question.id}
                        className={`transition-all ${
                          selectedQuestions.includes(question.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:border-gray-300'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={selectedQuestions.includes(question.id)}
                              onCheckedChange={() => handleQuestionToggle(question.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm mb-1">
                                    Q{index + 1}: {question.text}
                                  </h4>
                                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                    <span className="flex items-center gap-1">
                                      <Badge variant="outline" className="text-xs px-1 py-0">
                                        {question.type.replace('_', ' ')}
                                      </Badge>
                                    </span>
                                    {question.required && (
                                      <span className="text-red-500">Required</span>
                                    )}
                                    <span>Weight: {question.weightage}</span>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">Variable:</span> {question.variable.name}
                                    {question.variable.lever && (
                                      <>
                                        {' • '}
                                        <span className="font-medium">Lever:</span> {question.variable.lever.name}
                                        {' • '}
                                        <span className="font-medium">Pillar:</span> {question.variable.lever.pillar.name}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {availableQuestions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No questions available for the selected variables.
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/surveys">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Survey'}
          </Button>
        </div>
      </form>
    </div>
  );
}
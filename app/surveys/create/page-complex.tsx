'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft, Plus, X, FileText } from 'lucide-react';
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

export default function CreateSurveyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    
    if (session) {
      const canCreate = ['SUPER_ADMIN', 'ORG_ADMIN', 'SURVEY_CREATOR'].includes(session.user?.role || '');
      if (!canCreate) {
        router.push('/surveys');
        return;
      }
      fetchHierarchyData();
    }
  }, [session, status, router]);

  const fetchHierarchyData = async () => {
    try {
      const [pillarsRes, leversRes, variablesRes] = await Promise.all([
        fetch('/api/pillars'),
        fetch('/api/levers'),
        fetch('/api/variables')
      ]);

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
      console.error('Error fetching hierarchy data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load hierarchy data',
        variant: 'destructive'
      });
    }
  };

  const filteredLevers = useMemo(() => {
    if (selectedPillars.length === 0) return levers;
    return levers.filter(lever => selectedPillars.includes(lever.pillarId));
  }, [levers, selectedPillars]);

  const filteredVariables = useMemo(() => {
    if (selectedLevers.length === 0 && selectedPillars.length === 0) {
      return variables;
    }
    
    if (selectedLevers.length > 0) {
      return variables.filter(variable => 
        variable.leverId && selectedLevers.includes(variable.leverId)
      );
    }
    
    if (selectedPillars.length > 0) {
      const relevantLeverIds = levers
        .filter(lever => selectedPillars.includes(lever.pillarId))
        .map(lever => lever.id);
      
      return variables.filter(variable => 
        variable.leverId && relevantLeverIds.includes(variable.leverId)
      );
    }
    
    return variables;
  }, [variables, levers, selectedPillars, selectedLevers]);

  // Temporarily disabled to fix infinite loop
  // useEffect(() => {
  //   const updateQuestionPreview = async () => {
  //     const params = new URLSearchParams();
  //     if (selectedVariables.length > 0) {
  //       params.append('variables', selectedVariables.join(','));
  //     } else if (selectedLevers.length > 0) {
  //       params.append('levers', selectedLevers.join(','));
  //     } else if (selectedPillars.length > 0) {
  //       params.append('pillars', selectedPillars.join(','));
  //     }

  //     // If no selections, set count to 0
  //     if (selectedPillars.length === 0 && selectedLevers.length === 0 && selectedVariables.length === 0) {
  //       setQuestionPreview(0);
  //       return;
  //     }

  //     try {
  //       const response = await fetch(`/api/questions/count?${params}`);
  //       if (response.ok) {
  //         const data = await response.json();
  //         setQuestionPreview(data.count || 0);
  //       }
  //     } catch (error) {
  //       console.error('Error fetching question count:', error);
  //       setQuestionPreview(0);
  //     }
  //   };

  //   updateQuestionPreview();
  // }, [selectedPillars, selectedLevers, selectedVariables]);

  const handlePillarToggle = (pillarId: string) => {
    const newSelected = selectedPillars.includes(pillarId)
      ? selectedPillars.filter(id => id !== pillarId)
      : [...selectedPillars, pillarId];
    
    setSelectedPillars(newSelected);
    
    // Clear lever and variable selections when pillar selection changes
    setSelectedLevers([]);
    setSelectedVariables([]);
  };

  const handleLeverToggle = (leverId: string) => {
    const newSelected = selectedLevers.includes(leverId)
      ? selectedLevers.filter(id => id !== leverId)
      : [...selectedLevers, leverId];
    
    setSelectedLevers(newSelected);
    
    // Clear variable selections when lever selection changes
    setSelectedVariables([]);
  };

  const handleVariableToggle = (variableId: string) => {
    const newSelected = selectedVariables.includes(variableId)
      ? selectedVariables.filter(id => id !== variableId)
      : [...selectedVariables, variableId];
    
    setSelectedVariables(newSelected);
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

    if (selectedPillars.length === 0 && selectedLevers.length === 0 && selectedVariables.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one pillar, lever, or variable',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          maxResponses: formData.maxResponses ? parseInt(formData.maxResponses) : undefined,
          selectedPillars: selectedPillars.length > 0 ? selectedPillars : undefined,
          selectedLevers: selectedLevers.length > 0 ? selectedLevers : undefined,
          selectedVariables: selectedVariables.length > 0 ? selectedVariables : undefined
        })
      });

      if (response.ok) {
        const survey = await response.json();
        toast({
          title: 'Success',
          description: 'Survey created successfully'
        });
        router.push(`/surveys/${survey.id}/edit`);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create survey');
      }
    } catch (error) {
      console.error('Error creating survey:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create survey',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Survey</h1>
          <p className="text-gray-600 mt-2">Design your ESG assessment survey</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Set up the basic details of your survey
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
            {/* Question Preview */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">
                  {questionPreview} questions will be included in this survey
                </span>
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
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2" onClick={() => handlePillarToggle(pillar.id)}>
                        <Checkbox
                          checked={selectedPillars.includes(pillar.id)}
                          onCheckedChange={() => handlePillarToggle(pillar.id)}
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
                {filteredLevers.map((lever) => (
                  <Card 
                    key={lever.id} 
                    className={`cursor-pointer transition-all ${
                      selectedLevers.includes(lever.id) 
                        ? 'border-green-500 bg-green-50' 
                        : 'hover:border-gray-300'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2" onClick={() => handleLeverToggle(lever.id)}>
                        <Checkbox
                          checked={selectedLevers.includes(lever.id)}
                          onCheckedChange={() => handleLeverToggle(lever.id)}
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
                {filteredVariables.map((variable) => (
                  <Card 
                    key={variable.id} 
                    className={`cursor-pointer transition-all ${
                      selectedVariables.includes(variable.id) 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'hover:border-gray-300'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2" onClick={() => handleVariableToggle(variable.id)}>
                        <Checkbox
                          checked={selectedVariables.includes(variable.id)}
                          onCheckedChange={() => handleVariableToggle(variable.id)}
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

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/surveys">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Survey'}
          </Button>
        </div>
      </form>
    </div>
  );
}
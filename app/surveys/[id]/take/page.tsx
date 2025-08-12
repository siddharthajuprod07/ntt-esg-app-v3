'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, CheckCircle, AlertCircle, FileText, Clock, User } from 'lucide-react';
import Link from 'next/link';

interface SurveyQuestion {
  id: string;
  text: string;
  type: string;
  options?: Array<{
    text: string;
    absoluteScore: number;
    internalScore: number;
  }>;
  required: boolean;
  order: number;
  weight: number;
  groupId?: string;
  isGroupLead: boolean;
  requiresEvidence: boolean;
  evidenceDescription?: string;
  variableQuestion: {
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
  questions: SurveyQuestion[];
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    responses: number;
  };
}

interface Answer {
  questionId: string;
  value: string;
  evidence?: string;
}

export default function TakeSurveyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const surveyId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evidences, setEvidences] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasExistingResponse, setHasExistingResponse] = useState(false);

  // Load survey data
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    
    if (session) {
      fetchSurveyData();
    }
  }, [session, status, router, surveyId]);

  const fetchSurveyData = async () => {
    setDataLoading(true);
    try {
      const response = await fetch(`/api/surveys/${surveyId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Survey not found');
        }
        throw new Error('Failed to load survey');
      }

      const surveyData = await response.json();
      
      if (!surveyData.isPublished) {
        throw new Error('This survey is not published');
      }

      // Check if survey is within date range
      const now = new Date();
      if (surveyData.startDate && new Date(surveyData.startDate) > now) {
        throw new Error('This survey has not started yet');
      }
      if (surveyData.endDate && new Date(surveyData.endDate) < now) {
        throw new Error('This survey has ended');
      }

      setSurvey(surveyData);

      // Check if user already has a response
      const responseCheck = await fetch(`/api/surveys/${surveyId}/responses/check`);
      if (responseCheck.ok) {
        const responseData = await responseCheck.json();
        if (responseData.hasResponse) {
          setHasExistingResponse(true);
          if (responseData.isCompleted) {
            setIsCompleted(true);
          } else {
            // Load existing answers and evidences
            setAnswers(responseData.answers || {});
            setEvidences(responseData.evidences || {});
          }
        }
      }
    } catch (error) {
      console.error('Error fetching survey:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load survey',
        variant: 'destructive'
      });
      router.push('/surveys');
    } finally {
      setDataLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleEvidenceChange = (questionId: string, value: string) => {
    setEvidences(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleFileUpload = async (questionId: string, file: File) => {
    // For now, we'll store the file name. In production, you'd upload to a storage service
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setEvidences(prev => ({
        ...prev,
        [questionId]: base64String
      }));
      toast({
        title: 'Evidence Uploaded',
        description: `File "${file.name}" has been attached.`
      });
    };
    reader.readAsDataURL(file);
  };

  const handleMultiSelectChange = (questionId: string, optionText: string, checked: boolean) => {
    const currentValue = answers[questionId] || '';
    const currentOptions = currentValue ? currentValue.split(',').map(s => s.trim()) : [];
    
    let newOptions;
    if (checked) {
      newOptions = [...currentOptions, optionText];
    } else {
      newOptions = currentOptions.filter(option => option !== optionText);
    }
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: newOptions.join(', ')
    }));
  };

  const validateCurrentStep = () => {
    if (!survey) return false;
    
    const currentQuestion = survey.questions[currentStep];
    if (!currentQuestion) return false;

    if (currentQuestion.required && !answers[currentQuestion.id]?.trim()) {
      toast({
        title: 'Required Field',
        description: 'Please answer this required question before proceeding.',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    
    if (survey && currentStep < survey.questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSaveDraft = async () => {
    if (!survey) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          answers: answers,
          evidences: evidences,
          isDraft: true
        })
      });

      if (response.ok) {
        toast({
          title: 'Draft Saved',
          description: 'Your progress has been saved as a draft.'
        });
        setHasExistingResponse(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save draft',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!survey) return;

    // Validate all required questions
    const unansweredRequired = survey.questions.filter(q => 
      q.required && !answers[q.id]?.trim()
    );

    if (unansweredRequired.length > 0) {
      toast({
        title: 'Incomplete Survey',
        description: `Please answer all required questions. ${unansweredRequired.length} required questions remain.`,
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          answers: answers,
          evidences: evidences,
          isDraft: false
        })
      });

      if (response.ok) {
        setIsCompleted(true);
        toast({
          title: 'Survey Submitted',
          description: 'Thank you for completing the survey!'
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit survey');
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit survey',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: SurveyQuestion) => {
    const currentAnswer = answers[question.id] || '';

    return (
      <Card key={question.id} className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2">
                Q{question.order}: {question.text}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Badge variant="outline" className="text-xs">
                  {question.type.replace('_', ' ')}
                </Badge>
                {question.weight !== 1 && (
                  <Badge variant="secondary" className="text-xs">
                    Weight: {question.weight}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Variable:</span> {question.variableQuestion.variable.name}
                {question.variableQuestion.variable.lever && (
                  <>
                    {' • '}
                    <span className="font-medium">Lever:</span> {question.variableQuestion.variable.lever.name}
                    {' • '}
                    <span className="font-medium">Pillar:</span> {question.variableQuestion.variable.lever.pillar.name}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {question.type === 'text' && (
            <div>
              <Textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder="Enter your answer..."
                rows={4}
                className="w-full"
              />
            </div>
          )}

          {question.type === 'single_select' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id={`${question.id}-${index}`}
                    name={question.id}
                    value={option.text}
                    checked={currentAnswer === option.text}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <Label htmlFor={`${question.id}-${index}`} className="flex-1 cursor-pointer">
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {question.type === 'multi_select' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, index) => {
                const selectedOptions = currentAnswer ? currentAnswer.split(',').map(s => s.trim()) : [];
                const isChecked = selectedOptions.includes(option.text);
                
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <Checkbox
                      id={`${question.id}-${index}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => 
                        handleMultiSelectChange(question.id, option.text, checked as boolean)
                      }
                    />
                    <Label htmlFor={`${question.id}-${index}`} className="flex-1 cursor-pointer">
                      {option.text}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}

          {question.requiresEvidence && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Evidence Required</span>
              </div>
              <p className="text-sm text-amber-700 mb-3">
                {question.evidenceDescription || 'Please provide supporting evidence for your answer.'}
              </p>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor={`evidence-file-${question.id}`} className="text-sm font-medium">
                    Upload Evidence File
                  </Label>
                  <Input
                    id={`evidence-file-${question.id}`}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(question.id, file);
                      }
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Accepted formats: PDF, Word, Excel, Images (PNG, JPG)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor={`evidence-text-${question.id}`} className="text-sm font-medium">
                    Or provide evidence description/link
                  </Label>
                  <Textarea
                    id={`evidence-text-${question.id}`}
                    value={evidences[question.id] || ''}
                    onChange={(e) => handleEvidenceChange(question.id, e.target.value)}
                    placeholder="Enter evidence description or paste a link..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {evidences[question.id] && evidences[question.id].startsWith('data:') && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">Evidence file uploaded</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
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

  if (isCompleted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Survey Completed!</h1>
            <p className="text-gray-600 mb-6">
              Thank you for completing "{survey.title}". Your responses have been recorded.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/surveys">
                <Button variant="outline">
                  View All Surveys
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button>
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = survey.questions.length > 0 ? ((currentStep + 1) / survey.questions.length) * 100 : 0;
  const currentQuestion = survey.questions[currentStep];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/surveys">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Surveys
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{survey.title}</h1>
          {survey.description && (
            <p className="text-gray-600 mt-2">{survey.description}</p>
          )}
        </div>
        <div className="text-sm text-gray-500 text-right">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            {survey.createdBy.name}
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline">{survey.category}</Badge>
          </div>
        </div>
      </div>

      {hasExistingResponse && !isCompleted && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-800">
              <Clock className="h-4 w-4" />
              <p className="font-medium">
                You have a draft response for this survey. You can continue where you left off.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">
            Question {currentStep + 1} of {survey.questions.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progress)}% complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current Question */}
      {currentQuestion && renderQuestion(currentQuestion)}

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>

          {currentStep < survey.questions.length - 1 ? (
            <Button onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Survey'}
            </Button>
          )}
        </div>
      </div>

      {/* Survey Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-sm">Survey Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Questions:</span> {survey.questions.length}
            </div>
            <div>
              <span className="font-medium">Responses:</span> {survey._count.responses}
            </div>
            {survey.startDate && (
              <div>
                <span className="font-medium">Start:</span> {new Date(survey.startDate).toLocaleDateString()}
              </div>
            )}
            {survey.endDate && (
              <div>
                <span className="font-medium">End:</span> {new Date(survey.endDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Upload, Edit, Trash2, Download, FileQuestion, Users, HelpCircle } from 'lucide-react';

interface QuestionOption {
  text: string;
  absoluteScore: number;
  internalScore: number;
}

interface Question {
  id: string;
  text: string;
  type: 'single_select' | 'multi_select' | 'text';
  options?: QuestionOption[];
  required: boolean;
  weightage: number;
  order: number;
  groupId?: string;
  isGroupLead: boolean;
  requiresEvidence: boolean;
  evidenceDescription?: string;
  variableId: string;
  variable?: {
    id: string;
    name: string;
    lever?: {
      id: string;
      name: string;
      pillar?: {
        id: string;
        name: string;
      };
    };
  };
}

interface Variable {
  id: string;
  name: string;
  lever?: {
    id: string;
    name: string;
    pillar?: {
      id: string;
      name: string;
    };
  };
}

export default function QuestionsPage() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<string>('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    text: '',
    type: 'single_select' as 'single_select' | 'multi_select' | 'text',
    options: [{ text: '', absoluteScore: 0, internalScore: 0 }],
    required: true,
    weightage: 1.0,
    order: 1,
    groupId: '',
    isGroupLead: false,
    requiresEvidence: false,
    evidenceDescription: '',
    variableId: ''
  });

  useEffect(() => {
    fetchQuestions();
    fetchVariables();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/questions');
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVariables = async () => {
    try {
      const response = await fetch('/api/variables?isActive=true');
      if (response.ok) {
        const data = await response.json();
        setVariables(data);
      }
    } catch (error) {
      console.error('Error fetching variables:', error);
    }
  };

  const handleCreateQuestion = async () => {
    try {
      const payload = {
        ...formData,
        options: formData.type !== 'text' ? formData.options.filter(opt => opt.text) : null
      };

      const response = await fetch('/api/questions', {
        method: editingQuestion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingQuestion ? { ...payload, id: editingQuestion.id } : payload)
      });

      if (response.ok) {
        await fetchQuestions();
        setIsCreateDialogOpen(false);
        resetForm();
        toast({
          title: editingQuestion ? "Question Updated" : "Question Created",
          description: editingQuestion 
            ? "The question has been successfully updated." 
            : "The question has been successfully created.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save the question. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating/updating question:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;

    try {
      const response = await fetch(`/api/questions/${questionToDelete}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchQuestions();
        toast({
          title: "Question Deleted",
          description: "The question has been successfully deleted.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete the question. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the question.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setQuestionToDelete(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setQuestionToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('variableId', selectedVariable);

    try {
      const response = await fetch('/api/questions/bulk-upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        await fetchQuestions();
        setIsBulkUploadDialogOpen(false);
        setSelectedVariable('');
        toast({
          title: "Upload Successful",
          description: result.message || "Questions have been successfully uploaded.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to upload questions. Please check your file and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred during upload. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    // Create the Excel template data
    const templateData = [
      {
        'Question Text': 'What is your organization\'s carbon footprint reduction target?',
        'Type': 'single_select',
        'Option 1': 'No target set',
        'Option 1 Absolute Score': 0,
        'Option 1 Internal Score': 0,
        'Option 2': '10-20% reduction',
        'Option 2 Absolute Score': 5,
        'Option 2 Internal Score': 4,
        'Option 3': '20-40% reduction',
        'Option 3 Absolute Score': 8,
        'Option 3 Internal Score': 7,
        'Option 4': '>40% reduction',
        'Option 4 Absolute Score': 10,
        'Option 4 Internal Score': 10,
        'Option 5': '',
        'Option 5 Absolute Score': '',
        'Option 5 Internal Score': '',
        'Required': 'TRUE',
        'Weightage': 2.0,
        'Order': 1,
        'Group ID': 'carbon-emissions',
        'Is Group Lead': 'TRUE',
        'Requires Evidence': 'TRUE',
        'Evidence Description': 'Please upload your carbon reduction strategy document'
      },
      {
        'Question Text': 'Do you track Scope 1 emissions?',
        'Type': 'single_select',
        'Option 1': 'Yes',
        'Option 1 Absolute Score': 10,
        'Option 1 Internal Score': 10,
        'Option 2': 'No',
        'Option 2 Absolute Score': 0,
        'Option 2 Internal Score': 0,
        'Option 3': 'Partially',
        'Option 3 Absolute Score': 5,
        'Option 3 Internal Score': 5,
        'Option 4': '',
        'Option 4 Absolute Score': '',
        'Option 4 Internal Score': '',
        'Option 5': '',
        'Option 5 Absolute Score': '',
        'Option 5 Internal Score': '',
        'Required': 'TRUE',
        'Weightage': 1.5,
        'Order': 2,
        'Group ID': 'carbon-emissions',
        'Is Group Lead': 'FALSE',
        'Requires Evidence': 'TRUE',
        'Evidence Description': 'Upload Scope 1 emissions report'
      },
      {
        'Question Text': 'What renewable energy sources do you use?',
        'Type': 'multi_select',
        'Option 1': 'Solar',
        'Option 1 Absolute Score': 3,
        'Option 1 Internal Score': 3,
        'Option 2': 'Wind',
        'Option 2 Absolute Score': 3,
        'Option 2 Internal Score': 3,
        'Option 3': 'Hydro',
        'Option 3 Absolute Score': 2,
        'Option 3 Internal Score': 2,
        'Option 4': 'Geothermal',
        'Option 4 Absolute Score': 2,
        'Option 4 Internal Score': 2,
        'Option 5': 'Biomass',
        'Option 5 Absolute Score': 2,
        'Option 5 Internal Score': 2,
        'Required': 'FALSE',
        'Weightage': 1.8,
        'Order': 3,
        'Group ID': 'energy-management',
        'Is Group Lead': 'TRUE',
        'Requires Evidence': 'FALSE',
        'Evidence Description': ''
      },
      {
        'Question Text': 'Describe your sustainability initiatives',
        'Type': 'text',
        'Option 1': '',
        'Option 1 Absolute Score': '',
        'Option 1 Internal Score': '',
        'Option 2': '',
        'Option 2 Absolute Score': '',
        'Option 2 Internal Score': '',
        'Option 3': '',
        'Option 3 Absolute Score': '',
        'Option 3 Internal Score': '',
        'Option 4': '',
        'Option 4 Absolute Score': '',
        'Option 4 Internal Score': '',
        'Option 5': '',
        'Option 5 Absolute Score': '',
        'Option 5 Internal Score': '',
        'Required': 'TRUE',
        'Weightage': 1.0,
        'Order': 4,
        'Group ID': '',
        'Is Group Lead': 'FALSE',
        'Requires Evidence': 'FALSE',
        'Evidence Description': ''
      }
    ];

    // Generate Excel file
    fetch('/api/questions/generate-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: templateData })
    })
    .then(response => response.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'questions_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(error => {
      console.error('Error downloading template:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the template. Please try again.",
        variant: "destructive",
      });
    });
  };

  const resetForm = () => {
    setFormData({
      text: '',
      type: 'single_select',
      options: [{ text: '', absoluteScore: 0, internalScore: 0 }],
      required: true,
      weightage: 1.0,
      order: questions.length + 1,
      groupId: '',
      isGroupLead: false,
      requiresEvidence: false,
      evidenceDescription: '',
      variableId: ''
    });
    setEditingQuestion(null);
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { text: '', absoluteScore: 0, internalScore: 0 }]
    });
  };

  const updateOption = (index: number, field: keyof QuestionOption, value: string | number) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index)
    });
  };

  const startEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      text: question.text,
      type: question.type,
      options: question.options || [{ text: '', absoluteScore: 0, internalScore: 0 }],
      required: question.required,
      weightage: question.weightage,
      order: question.order,
      groupId: question.groupId || '',
      isGroupLead: question.isGroupLead,
      requiresEvidence: question.requiresEvidence,
      evidenceDescription: question.evidenceDescription || '',
      variableId: question.variableId
    });
    setIsCreateDialogOpen(true);
  };

  // Group questions by variable
  const groupedQuestions = questions.reduce((acc, question) => {
    const key = question.variable?.name || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(question);
    return acc;
  }, {} as Record<string, Question[]>);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">ESG Questions Management</h1>
          <p className="text-gray-600 mt-2">Create and manage assessment questions for variables</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bulk Upload Questions</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with questions. Download the template for the correct format.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-variable">Select Variable</Label>
                  <Select value={selectedVariable} onValueChange={setSelectedVariable}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a variable" />
                    </SelectTrigger>
                    <SelectContent>
                      {variables.map(variable => (
                        <SelectItem key={variable.id} value={variable.id}>
                          {variable.lever?.pillar?.name} → {variable.lever?.name} → {variable.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Button onClick={downloadTemplate} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel Template
                  </Button>
                </div>
                <div>
                  <Label htmlFor="file-upload">Upload File (Excel or CSV)</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleBulkUpload}
                    disabled={!selectedVariable}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Supported formats: .xlsx, .xls, .csv
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm();
                setIsCreateDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingQuestion ? 'Edit Question' : 'Create New Question'}</DialogTitle>
                <DialogDescription>
                  Add assessment questions to evaluate ESG variables
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="variable">Variable *</Label>
                  <Select value={formData.variableId} onValueChange={(value) => setFormData({ ...formData, variableId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a variable" />
                    </SelectTrigger>
                    <SelectContent>
                      {variables.map(variable => (
                        <SelectItem key={variable.id} value={variable.id}>
                          {variable.lever?.pillar?.name} → {variable.lever?.name} → {variable.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="text">Question Text *</Label>
                  <Input
                    id="text"
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    placeholder="Enter question text"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Question Type *</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_select">Single Select</SelectItem>
                      <SelectItem value="multi_select">Multi Select</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type !== 'text' && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label>Options</Label>
                      <TooltipProvider>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p><strong>Absolute Score:</strong> The actual score value used for external reporting and benchmarking. This represents the objective assessment score (typically 0-10).</p>
                              </TooltipContent>
                            </Tooltip>
                            <span>Absolute Score</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p><strong>Internal Score:</strong> The weighted score used for internal calculations and analytics. This can be adjusted based on organizational priorities.</p>
                              </TooltipContent>
                            </Tooltip>
                            <span>Internal Score</span>
                          </div>
                        </div>
                      </TooltipProvider>
                    </div>
                    <div className="space-y-2">
                      {formData.options.map((option, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Input
                            placeholder="Option text"
                            value={option.text}
                            onChange={(e) => updateOption(index, 'text', e.target.value)}
                            className="flex-1"
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Input
                                  type="number"
                                  placeholder="Absolute"
                                  value={option.absoluteScore}
                                  onChange={(e) => updateOption(index, 'absoluteScore', parseFloat(e.target.value))}
                                  className="w-24"
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>External reporting score (0-10)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Input
                                  type="number"
                                  placeholder="Internal"
                                  value={option.internalScore}
                                  onChange={(e) => updateOption(index, 'internalScore', parseFloat(e.target.value))}
                                  className="w-24"
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Internal weighted score</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeOption(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={addOption}>
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weightage">Weightage</Label>
                    <Input
                      id="weightage"
                      type="number"
                      step="0.1"
                      value={formData.weightage}
                      onChange={(e) => setFormData({ ...formData, weightage: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="order">Order</Label>
                    <Input
                      id="order"
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="groupId">Group ID (Optional)</Label>
                    <Input
                      id="groupId"
                      value={formData.groupId}
                      onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                      placeholder="e.g., carbon-emissions"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isGroupLead"
                      checked={formData.isGroupLead}
                      onCheckedChange={(checked) => setFormData({ ...formData, isGroupLead: checked })}
                    />
                    <Label htmlFor="isGroupLead">Is Group Lead</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="required"
                      checked={formData.required}
                      onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
                    />
                    <Label htmlFor="required">Required Question</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requiresEvidence"
                      checked={formData.requiresEvidence}
                      onCheckedChange={(checked) => setFormData({ ...formData, requiresEvidence: checked })}
                    />
                    <Label htmlFor="requiresEvidence">Requires Evidence Upload</Label>
                  </div>
                </div>

                {formData.requiresEvidence && (
                  <div>
                    <Label htmlFor="evidenceDescription">Evidence Description</Label>
                    <Input
                      id="evidenceDescription"
                      value={formData.evidenceDescription}
                      onChange={(e) => setFormData({ ...formData, evidenceDescription: e.target.value })}
                      placeholder="Describe what evidence is required"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateQuestion} disabled={!formData.text || !formData.variableId}>
                    {editingQuestion ? 'Update' : 'Create'} Question
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading questions...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedQuestions).map(([variableName, questions]) => (
            <Card key={variableName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileQuestion className="h-5 w-5" />
                  {variableName}
                  <Badge variant="secondary">{questions.length} questions</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {questions.sort((a, b) => a.order - b.order).map(question => (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">Q{question.order}.</span>
                            <span>{question.text}</span>
                            {question.required && <Badge variant="destructive">Required</Badge>}
                            {question.requiresEvidence && <Badge variant="outline">Evidence</Badge>}
                            {question.groupId && (
                              <Badge variant="outline">
                                <Users className="h-3 w-3 mr-1" />
                                {question.groupId}
                                {question.isGroupLead && ' (Lead)'}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            Type: <Badge variant="secondary">{question.type.replace('_', ' ')}</Badge>
                            {' • '}
                            Weightage: {question.weightage}
                          </div>
                          {question.type !== 'text' && question.options && (
                            <div className="mt-2">
                              <div className="text-sm font-medium mb-1">Options:</div>
                              <div className="space-y-1">
                                {question.options.map((option, idx) => (
                                  <div key={idx} className="text-sm ml-4">
                                    • {option.text} (Absolute: {option.absoluteScore}, Internal: {option.internalScore})
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {question.evidenceDescription && (
                            <div className="mt-2 text-sm text-gray-600">
                              Evidence: {question.evidenceDescription}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEdit(question)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(question.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setQuestionToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteQuestion}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit, Trash2, Copy, Move, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VariableNode {
  id: string;
  name: string;
  weightage: number;
  description?: string | null;
  level: number;
  path?: string | null;
  parentId?: string | null;
  leverId?: string | null;
  children?: VariableNode[];
  questions?: any[];
  aggregationType?: string | null;
}

interface VariableTreeViewProps {
  leverId: string;
  onVariableSelect?: (variable: VariableNode) => void;
}

const VariableTreeNode: React.FC<{
  node: VariableNode;
  onSelect?: (variable: VariableNode) => void;
  onRefresh: () => void;
}> = ({ node, onSelect, onRefresh }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [showStatsDialog, setShowStatsDialog] = useState(false);

  const hasChildren = node.children && node.children.length > 0;
  const hasQuestions = node.questions && node.questions.length > 0;

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/variables/hierarchy?variableId=${node.id}&action=stats`);
      const data = await response.json();
      setStats(data);
      setShowStatsDialog(true);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${node.name}" and all its children?`)) {
      try {
        await fetch(`/api/variables/${node.id}`, {
          method: 'DELETE',
        });
        onRefresh();
      } catch (error) {
        console.error('Error deleting variable:', error);
      }
    }
  };

  const handleClone = async () => {
    try {
      await fetch('/api/variables/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clone',
          sourceVariableId: node.id,
          targetParentId: node.parentId,
          targetLeverId: node.leverId,
        }),
      });
      onRefresh();
    } catch (error) {
      console.error('Error cloning variable:', error);
    }
  };

  return (
    <div className="ml-4">
      <div
        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={() => onSelect?.(node)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <div className="w-5" />
        )}
        
        <div className="flex-1 flex items-center gap-2">
          <span className="font-medium">{node.name}</span>
          <span className="text-xs text-gray-500">
            (L{node.level}, W: {node.weightage})
          </span>
          {hasQuestions && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
              {node.questions.length} Q
            </span>
          )}
          {node.aggregationType && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
              {node.aggregationType}
            </span>
          )}
        </div>

        {showActions && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                fetchStats();
              }}
            >
              <Hash size={14} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleClone();
              }}
            >
              <Copy size={14} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="ml-2 border-l border-gray-200">
          {node.children!.map((child) => (
            <VariableTreeNode
              key={child.id}
              node={child}
              onSelect={onSelect}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Variable Statistics: {node.name}</DialogTitle>
          </DialogHeader>
          {stats && (
            <div className="space-y-2">
              <div>Path: {stats.path}</div>
              <div>Level: {stats.level}</div>
              <div>Direct Children: {stats.directChildren}</div>
              <div>Total Descendants: {stats.totalDescendants}</div>
              <div>Direct Questions: {stats.directQuestions}</div>
              <div>Total Questions: {stats.totalQuestions}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function VariableTreeView({ leverId, onVariableSelect }: VariableTreeViewProps) {
  const [tree, setTree] = useState<VariableNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedParent, setSelectedParent] = useState<VariableNode | null>(null);
  const [newVariable, setNewVariable] = useState({
    name: '',
    description: '',
    weightage: 1,
    aggregationType: 'SUM',
  });

  const fetchTree = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/variables/hierarchy?leverId=${leverId}`);
      const data = await response.json();
      setTree(data);
    } catch (error) {
      console.error('Error fetching variable tree:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, [leverId]);

  const handleAddVariable = async () => {
    try {
      await fetch('/api/variables/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newVariable,
          leverId: selectedParent ? undefined : leverId,
          parentId: selectedParent?.id,
        }),
      });
      setShowAddDialog(false);
      setNewVariable({ name: '', description: '', weightage: 1, aggregationType: 'SUM' });
      setSelectedParent(null);
      fetchTree();
    } catch (error) {
      console.error('Error adding variable:', error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading variable hierarchy...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Variable Hierarchy</CardTitle>
            <CardDescription>
              Manage hierarchical variables and their relationships
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Variable
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tree.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No variables found. Add a root variable to get started.
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map((node) => (
              <VariableTreeNode
                key={node.id}
                node={node}
                onSelect={(v) => {
                  setSelectedParent(v);
                  onVariableSelect?.(v);
                }}
                onRefresh={fetchTree}
              />
            ))}
          </div>
        )}

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Variable</DialogTitle>
              <DialogDescription>
                {selectedParent
                  ? `Adding child variable under: ${selectedParent.name}`
                  : 'Adding root variable to lever'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newVariable.name}
                  onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                  placeholder="Variable name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newVariable.description}
                  onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <Label htmlFor="weightage">Weightage</Label>
                <Input
                  id="weightage"
                  type="number"
                  step="0.1"
                  value={newVariable.weightage}
                  onChange={(e) => setNewVariable({ ...newVariable, weightage: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="aggregationType">Aggregation Type</Label>
                <Select
                  value={newVariable.aggregationType}
                  onValueChange={(value) => setNewVariable({ ...newVariable, aggregationType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUM">Sum</SelectItem>
                    <SelectItem value="AVERAGE">Average</SelectItem>
                    <SelectItem value="WEIGHTED_AVERAGE">Weighted Average</SelectItem>
                    <SelectItem value="MAX">Maximum</SelectItem>
                    <SelectItem value="MIN">Minimum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddVariable}>Add Variable</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import type { Category } from '@/lib/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onCreateCategory: (name: string, color: string) => Promise<void>;
  onUpdateCategory: (id: string, name: string, color: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

const COLORS = [
  '#b91c1c',
  '#c2410c',
  '#b45309',
  '#a16207',
  '#4d7c0f',
  '#15803d',
  '#047857',
  '#0f766e',
  '#0e7490',
  '#0369a1',
  '#1e40af',
  '#4338ca',
  '#6d28d9',
  '#7e22ce',
  '#a21caf',
  '#be185d',
];

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategorySidebarProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newCategoryName.trim()) return;
    await onCreateCategory(newCategoryName, newCategoryColor);
    setNewCategoryName('');
    setNewCategoryColor(COLORS[0]);
    setIsAdding(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    await onUpdateCategory(id, editName, editColor);
    setEditingId(null);
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color || COLORS[0]);
  };

  return (
    <div className="glass-panel border-r border-white/10 flex flex-col h-full backdrop-blur-xl">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white mb-3">Categories</h2>
        <Button
          onClick={() => onSelectCategory(null)}
          variant="ghost"
          className={`w-full justify-start rounded-lg transition-all duration-200 ${
            selectedCategoryId === null
              ? 'btn-gradient text-white'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          All Tasks
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {categories.map((category) => (
          <div key={category.id} className="group">
            {editingId === category.id ? (
              <div className="space-y-2 p-3 glass-panel rounded-xl border-white/10">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="glass-input text-white h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdate(category.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                />
                <div className="grid grid-cols-8 gap-1.5">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditColor(color)}
                      className={`w-7 h-7 rounded-lg border transition-all duration-150 hover:scale-110 ${
                        editColor === color
                          ? 'border-white shadow-lg scale-110'
                          : 'border-white/20 hover:border-white/40'
                      }`}
                      style={{
                        backgroundColor: color,
                        boxShadow: editColor === color ? '0 0 12px rgba(139, 92, 246, 0.5)' : 'none'
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdate(category.id)}
                    className="btn-gradient h-8 text-xs flex-1 font-medium"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                    className="glass-input h-8 text-xs hover:bg-white/10"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedCategoryId === category.id
                    ? 'btn-gradient text-white'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
                onClick={() => onSelectCategory(category.id)}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color || '#3b82f6' }}
                />
                <span className="flex-1 truncate text-sm font-medium">{category.name}</span>
                <div className="hidden group-hover:flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(category);
                    }}
                    className="h-6 w-6 p-0 hover:bg-white/10 transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(category.id);
                    }}
                    className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
        {isAdding ? (
          <div className="space-y-3">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="glass-input text-white placeholder:text-gray-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setIsAdding(false);
              }}
              autoFocus
            />
            <div className="grid grid-cols-8 gap-1.5">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewCategoryColor(color)}
                  className={`w-7 h-7 rounded-lg border transition-all duration-150 hover:scale-110 ${
                    newCategoryColor === color
                      ? 'border-white shadow-lg scale-110'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                  style={{
                    backgroundColor: color,
                    boxShadow: newCategoryColor === color ? '0 0 12px rgba(139, 92, 246, 0.5)' : 'none'
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                className="btn-gradient flex-1 font-medium"
              >
                <Check className="h-4 w-4 mr-2" />
                Create
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAdding(false)}
                className="glass-input hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setIsAdding(true)}
            className="w-full btn-gradient font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        )}
      </div>

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent className="glass-panel border-white/10 text-white backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">Delete Category</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure? Tasks in this category will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-input text-white hover:bg-white/10 transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) onDeleteCategory(deleteConfirmId);
                setDeleteConfirmId(null);
              }}
              className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/30 transition-colors"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

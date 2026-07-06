import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { GateItem } from '@/hooks/useGateItems';

export interface GateItemFormValue {
  id?: string;
  item_key: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  rarity: string;
  category: string;
  icon: string;
  image: string | null;
  drop_rate: number;
  quantity: number;
  stackable: boolean;
  max_stack: number;
  duration_minutes: number | null;
  effect_type: string | null;
  effect_value: number | null;
  gate_rank: string;
  is_active: boolean;
  sort_order: number;
}

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const GATE_RANKS = ['ALL', 'E', 'D', 'C', 'B', 'A', 'S'];
const CATEGORIES = ['consumable', 'stone', 'material', 'equipment', 'cosmetic', 'special'];
const EFFECT_TYPES = ['xp_boost', 'gold_boost', 'stat_boost', 'heal', 'mp_restore', 'rename', 'reset', 'exit', 'grand_quest', 'hub', 'none'];

const empty: GateItemFormValue = {
  item_key: '',
  name_ar: '',
  name_en: '',
  description_ar: '',
  description_en: '',
  rarity: 'common',
  category: 'material',
  icon: '📦',
  image: null,
  drop_rate: 0.15,
  quantity: 1,
  stackable: true,
  max_stack: 999,
  duration_minutes: null,
  effect_type: null,
  effect_value: null,
  gate_rank: 'ALL',
  is_active: true,
  sort_order: 0,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: GateItem | null;
  saving: boolean;
  onSubmit: (value: GateItemFormValue) => Promise<void> | void;
}

export const GateItemFormDialog = ({ open, onOpenChange, initial, saving, onSubmit }: Props) => {
  const [value, setValue] = useState<GateItemFormValue>(empty);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setValue({
        id: initial.id,
        item_key: initial.item_key,
        name_ar: initial.name_ar,
        name_en: initial.name_en,
        description_ar: initial.description_ar ?? '',
        description_en: initial.description_en ?? '',
        rarity: initial.rarity,
        category: initial.category,
        icon: initial.icon,
        image: initial.image,
        drop_rate: Number(initial.drop_rate),
        quantity: initial.quantity,
        stackable: initial.stackable,
        max_stack: initial.max_stack,
        duration_minutes: initial.duration_minutes,
        effect_type: initial.effect_type,
        effect_value: initial.effect_value === null ? null : Number(initial.effect_value),
        gate_rank: initial.gate_rank,
        is_active: initial.is_active,
        sort_order: initial.sort_order,
      });
    } else {
      setValue(empty);
    }
    setError(null);
  }, [open, initial]);

  const set = <K extends keyof GateItemFormValue>(k: K, v: GateItemFormValue[K]) =>
    setValue((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!value.item_key.trim()) return setError('Item key required');
    if (!/^[a-z0-9_\-]+$/.test(value.item_key)) return setError('Item key must be lowercase alphanumeric / _ / -');
    if (!value.name_en.trim() || !value.name_ar.trim()) return setError('Both names required');
    if (value.drop_rate < 0 || value.drop_rate > 1) return setError('Drop rate must be between 0 and 1');
    if (value.quantity < 1) return setError('Quantity must be at least 1');
    setError(null);
    await onSubmit(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Gate Item' : 'Create Gate Item'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <Field label="Item Key" required>
            <Input
              value={value.item_key}
              onChange={(e) => set('item_key', e.target.value.toLowerCase())}
              placeholder="mana_crystal"
              disabled={!!initial}
            />
          </Field>
          <Field label="Icon (emoji)">
            <Input value={value.icon} onChange={(e) => set('icon', e.target.value)} maxLength={4} />
          </Field>

          <Field label="Name (EN)" required>
            <Input value={value.name_en} onChange={(e) => set('name_en', e.target.value)} />
          </Field>
          <Field label="Name (AR)" required>
            <Input value={value.name_ar} onChange={(e) => set('name_ar', e.target.value)} dir="rtl" />
          </Field>

          <Field label="Description (EN)" className="md:col-span-2">
            <Textarea rows={2} value={value.description_en} onChange={(e) => set('description_en', e.target.value)} />
          </Field>
          <Field label="Description (AR)" className="md:col-span-2">
            <Textarea rows={2} value={value.description_ar} onChange={(e) => set('description_ar', e.target.value)} dir="rtl" />
          </Field>

          <Field label="Category">
            <Select value={value.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Rarity">
            <Select value={value.rarity} onValueChange={(v) => set('rarity', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RARITIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Gate Rank">
            <Select value={value.gate_rank} onValueChange={(v) => set('gate_rank', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GATE_RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Sort Order">
            <Input type="number" value={value.sort_order} onChange={(e) => set('sort_order', Number(e.target.value) || 0)} />
          </Field>

          <Field label={`Drop Rate (0-1) — ${(value.drop_rate * 100).toFixed(1)}%`}>
            <Input
              type="number" min={0} max={1} step="0.01"
              value={value.drop_rate}
              onChange={(e) => set('drop_rate', Math.min(1, Math.max(0, Number(e.target.value) || 0)))}
            />
          </Field>
          <Field label="Quantity per Drop">
            <Input type="number" min={1} value={value.quantity} onChange={(e) => set('quantity', Math.max(1, Number(e.target.value) || 1))} />
          </Field>

          <Field label="Effect Type">
            <Select
              value={value.effect_type ?? 'none'}
              onValueChange={(v) => set('effect_type', v === 'none' ? null : v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EFFECT_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Effect Value">
            <Input
              type="number" step="0.01"
              value={value.effect_value ?? ''}
              onChange={(e) => set('effect_value', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>

          <Field label="Duration (minutes)">
            <Input
              type="number" min={0}
              value={value.duration_minutes ?? ''}
              onChange={(e) => set('duration_minutes', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Max Stack">
            <Input type="number" min={1} value={value.max_stack} onChange={(e) => set('max_stack', Math.max(1, Number(e.target.value) || 1))} />
          </Field>

          <Field label="Image URL" className="md:col-span-2">
            <Input value={value.image ?? ''} onChange={(e) => set('image', e.target.value || null)} placeholder="/assets/item.png" />
          </Field>

          <ToggleField label="Stackable" checked={value.stackable} onChange={(v) => set('stackable', v)} />
          <ToggleField label="Active" checked={value.is_active} onChange={(v) => set('is_active', v)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {initial ? 'Save changes' : 'Create item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) => (
  <div className={className}>
    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
      {label}{required && <span className="text-destructive ml-1">*</span>}
    </Label>
    <div className="mt-1">{children}</div>
  </div>
);

const ToggleField = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between rounded-md border border-border/40 bg-background/40 px-3 py-2">
    <Label className="text-sm">{label}</Label>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default GateItemFormDialog;

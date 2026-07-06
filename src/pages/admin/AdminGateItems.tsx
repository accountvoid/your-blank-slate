import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGateItems, type GateItem } from '@/hooks/useGateItems';
import { AdminTable, type Column } from '@/components/admin/AdminTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { GateItemFormDialog, type GateItemFormValue } from '@/components/admin/GateItemFormDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { logAudit } from '@/lib/audit';

const rarityColor: Record<string, string> = {
  common: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  uncommon: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  rare: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  epic: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  legendary: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  mythic: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

const AdminGateItems = () => {
  const { items, loading, refresh } = useGateItems({ includeInactive: true });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GateItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<GateItem | null>(null);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item: GateItem) => { setEditing(item); setDialogOpen(true); };

  const handleSubmit = async (value: GateItemFormValue) => {
    setSaving(true);
    try {
      const payload = {
        item_key: value.item_key,
        name_ar: value.name_ar,
        name_en: value.name_en,
        description_ar: value.description_ar,
        description_en: value.description_en,
        rarity: value.rarity,
        category: value.category,
        icon: value.icon,
        image: value.image,
        drop_rate: value.drop_rate,
        quantity: value.quantity,
        stackable: value.stackable,
        max_stack: value.max_stack,
        duration_minutes: value.duration_minutes,
        effect_type: value.effect_type,
        effect_value: value.effect_value,
        gate_rank: value.gate_rank,
        is_active: value.is_active,
        sort_order: value.sort_order,
      };

      if (editing) {
        const { error, data } = await supabase
          .from('gate_items')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .single();
        if (error) throw error;
        await logAudit({ action: 'update', table: 'gate_items', recordId: editing.id, oldValue: editing, newValue: data });
        toast.success('Gate item updated');
      } else {
        const { error, data } = await supabase.from('gate_items').insert(payload).select().single();
        if (error) throw error;
        await logAudit({ action: 'create', table: 'gate_items', recordId: data?.id, newValue: data });
        toast.success('Gate item created');
      }
      setDialogOpen(false);
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: GateItem) => {
    const next = !item.is_active;
    const { error } = await supabase.from('gate_items').update({ is_active: next }).eq('id', item.id);
    if (error) return toast.error(error.message);
    await logAudit({ action: next ? 'enable' : 'disable', table: 'gate_items', recordId: item.id });
    toast.success(next ? 'Item enabled' : 'Item disabled');
    refresh();
  };

  const duplicate = async (item: GateItem) => {
    const suffix = Math.random().toString(36).slice(2, 6);
    const { id, created_at, updated_at, item_key, ...rest } = item;
    const { error, data } = await supabase
      .from('gate_items')
      .insert({ ...rest, item_key: `${item_key}_copy_${suffix}`, is_active: false })
      .select()
      .single();
    if (error) return toast.error(error.message);
    await logAudit({ action: 'duplicate', table: 'gate_items', recordId: data?.id, newValue: data });
    toast.success('Duplicated (disabled)');
    refresh();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setConfirmDelete(null);
    const { error } = await supabase.from('gate_items').delete().eq('id', target.id);
    if (error) return toast.error(error.message);
    await logAudit({ action: 'delete', table: 'gate_items', recordId: target.id, oldValue: target });
    toast.success('Item deleted');
    refresh();
  };

  const columns = useMemo<Column<GateItem>[]>(
    () => [
      { key: 'icon', header: '', sortable: false, className: 'w-10 text-xl', render: (r) => <span>{r.icon}</span> },
      {
        key: 'name_en',
        header: 'Name',
        accessor: (r) => r.name_en,
        render: (r) => (
          <div>
            <div className="font-medium">{r.name_en}</div>
            <div className="text-[10px] text-muted-foreground font-mono">{r.item_key}</div>
          </div>
        ),
      },
      { key: 'category', header: 'Category', accessor: (r) => r.category },
      {
        key: 'rarity',
        header: 'Rarity',
        accessor: (r) => r.rarity,
        render: (r) => <Badge variant="outline" className={rarityColor[r.rarity] ?? ''}>{r.rarity}</Badge>,
      },
      {
        key: 'gate_rank',
        header: 'Gate',
        accessor: (r) => r.gate_rank,
        render: (r) => <Badge variant="outline">{r.gate_rank}</Badge>,
      },
      {
        key: 'drop_rate',
        header: 'Drop %',
        accessor: (r) => Number(r.drop_rate),
        render: (r) => <span className="font-mono">{(Number(r.drop_rate) * 100).toFixed(1)}%</span>,
      },
      { key: 'quantity', header: 'Qty', accessor: (r) => r.quantity },
      { key: 'sort_order', header: 'Order', accessor: (r) => r.sort_order },
      {
        key: 'is_active',
        header: 'Active',
        accessor: (r) => (r.is_active ? 1 : 0),
        render: (r) => <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Gate Items</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the gate drop pool. Rolls are independent per-item using the drop rate. Rank <span className="font-mono">ALL</span> means eligible for every gate.
          </p>
        </div>
      </div>

      <AdminTable<GateItem>
        title="Drop Pool"
        description={`${items.length} item${items.length === 1 ? '' : 's'} total`}
        rows={items}
        columns={columns}
        loading={loading}
        getRowId={(r) => r.id}
        searchKeys={['item_key', 'name_en', 'name_ar', 'category', 'rarity', 'gate_rank']}
        onCreate={openCreate}
        actions={(r) => (
          <>
            <Button size="icon" variant="ghost" onClick={() => openEdit(r)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => duplicate(r)} title="Duplicate">
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setConfirmDelete(r)}
              title="Delete"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      />

      <GateItemFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        saving={saving}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete gate item?"
        description={confirmDelete ? `"${confirmDelete.name_en}" will be permanently removed from the drop pool.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default AdminGateItems;

import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopItems, type ShopItem } from '@/hooks/useShopItems';
import { AdminTable, type Column } from '@/components/admin/AdminTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ShopItemFormDialog, type ShopItemFormValue } from '@/components/admin/ShopItemFormDialog';
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

const AdminShopItems = () => {
  const { items, loading, refresh } = useShopItems({ includeInactive: true });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShopItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ShopItem | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (item: ShopItem) => {
    setEditing(item);
    setDialogOpen(true);
  };

  const handleSubmit = async (value: ShopItemFormValue) => {
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
        price_gold: value.price_gold,
        stackable: value.stackable,
        max_stack: value.max_stack,
        duration_minutes: value.duration_minutes,
        effect_type: value.effect_type,
        effect_value: value.effect_value,
        level_required: value.level_required,
        rank_required: value.rank_required,
        can_purchase: value.can_purchase,
        is_active: value.is_active,
        sort_order: value.sort_order,
      };

      if (editing) {
        const { error, data } = await supabase
          .from('shop_items')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .single();
        if (error) throw error;
        await logAudit({ action: 'update', table: 'shop_items', recordId: editing.id, oldValue: editing, newValue: data });
        toast.success('Shop item updated');
      } else {
        const { error, data } = await supabase.from('shop_items').insert(payload).select().single();
        if (error) throw error;
        await logAudit({ action: 'create', table: 'shop_items', recordId: data?.id, newValue: data });
        toast.success('Shop item created');
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

  const toggleActive = async (item: ShopItem) => {
    const next = !item.is_active;
    const { error } = await supabase.from('shop_items').update({ is_active: next }).eq('id', item.id);
    if (error) return toast.error(error.message);
    await logAudit({ action: next ? 'enable' : 'disable', table: 'shop_items', recordId: item.id });
    toast.success(next ? 'Item enabled' : 'Item disabled');
    refresh();
  };

  const duplicate = async (item: ShopItem) => {
    const suffix = Math.random().toString(36).slice(2, 6);
    const { id, created_at, updated_at, item_key, ...rest } = item;
    const { error, data } = await supabase
      .from('shop_items')
      .insert({ ...rest, item_key: `${item_key}_copy_${suffix}`, is_active: false })
      .select()
      .single();
    if (error) return toast.error(error.message);
    await logAudit({ action: 'duplicate', table: 'shop_items', recordId: data?.id, newValue: data });
    toast.success('Duplicated (disabled)');
    refresh();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setConfirmDelete(null);
    const { error } = await supabase.from('shop_items').delete().eq('id', target.id);
    if (error) return toast.error(error.message);
    await logAudit({ action: 'delete', table: 'shop_items', recordId: target.id, oldValue: target });
    toast.success('Item deleted');
    refresh();
  };

  const columns = useMemo<Column<ShopItem>[]>(
    () => [
      {
        key: 'icon',
        header: '',
        sortable: false,
        className: 'w-10 text-xl',
        render: (r) => <span>{r.icon}</span>,
      },
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
        render: (r) => (
          <Badge variant="outline" className={rarityColor[r.rarity] ?? ''}>{r.rarity}</Badge>
        ),
      },
      {
        key: 'price_gold',
        header: 'Price',
        accessor: (r) => r.price_gold,
        render: (r) => <span className="font-mono">{r.price_gold.toLocaleString()} G</span>,
      },
      {
        key: 'rank_required',
        header: 'Rank',
        accessor: (r) => r.rank_required,
        render: (r) => <Badge variant="outline">{r.rank_required}</Badge>,
      },
      {
        key: 'level_required',
        header: 'Lvl',
        accessor: (r) => r.level_required,
      },
      {
        key: 'sort_order',
        header: 'Order',
        accessor: (r) => r.sort_order,
      },
      {
        key: 'is_active',
        header: 'Active',
        accessor: (r) => (r.is_active ? 1 : 0),
        render: (r) => (
          <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Shop Items</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the market catalog. Changes appear instantly for every player through realtime sync.
          </p>
        </div>
      </div>

      <AdminTable<ShopItem>
        title="Catalog"
        description={`${items.length} item${items.length === 1 ? '' : 's'} total`}
        rows={items}
        columns={columns}
        loading={loading}
        getRowId={(r) => r.id}
        searchKeys={['item_key', 'name_en', 'name_ar', 'category', 'rarity']}
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

      <ShopItemFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        saving={saving}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete shop item?"
        description={confirmDelete ? `"${confirmDelete.name_en}" will be permanently removed. Consider disabling it instead if it's still referenced by any inventory.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default AdminShopItems;

import { useState } from 'react';
import { useFriendships, FriendProfile } from '@/hooks/useFriendships';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { User, UserCheck, UserX, Users, Clock, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const FriendsPanel = () => {
  const { friends, pendingReceived, pendingSent, loading, acceptRequest, rejectRequest, removeFriend } = useFriendships();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAccept = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    const { error } = await acceptRequest();
    if (error) toast({ title: 'خطأ', description: 'فشل قبول الطلب', variant: 'destructive' });
    else toast({ title: 'تم القبول', description: 'تمت إضافة الصديق بنجاح' });
    setActionLoading(null);
  };

  const handleReject = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    const { error } = await rejectRequest();
    if (error) toast({ title: 'خطأ', description: 'فشل رفض الطلب', variant: 'destructive' });
    else toast({ title: 'تم الرفض', description: 'تم رفض طلب الصداقة' });
    setActionLoading(null);
  };

  const handleRemove = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    const { error } = await removeFriend();
    if (error) toast({ title: 'خطأ', description: 'فشل إزالة الصديق', variant: 'destructive' });
    else toast({ title: 'تمت الإزالة', description: 'تم إزالة الصديق' });
    setActionLoading(null);
  };

  const FriendCard = ({ friend, type }: { friend: FriendProfile; type: 'friend' | 'received' | 'sent' }) => (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-primary/10">
      <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
        {friend.avatar_url ? (
          <img src={friend.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          <User className="w-5 h-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0 text-right">
        <p className="text-sm font-bold text-foreground truncate">{friend.player_name}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{friend.player_id}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {type === 'received' && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-green-400 hover:bg-green-500/20"
              onClick={() => handleAccept(friend.friendship_id)}
              disabled={actionLoading === friend.friendship_id}
            >
              {actionLoading === friend.friendship_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-red-400 hover:bg-red-500/20"
              onClick={() => handleReject(friend.friendship_id)}
              disabled={actionLoading === friend.friendship_id}
            >
              <UserX className="w-4 h-4" />
            </Button>
          </>
        )}
        {type === 'sent' && (
          <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full">بانتظار القبول</span>
        )}
        {type === 'friend' && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-400 hover:bg-red-500/20"
            onClick={() => handleRemove(friend.friendship_id)}
            disabled={actionLoading === friend.friendship_id}
          >
            {actionLoading === friend.friendship_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        )}
      </div>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-8">
      <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <section className="bg-card/60 backdrop-blur-lg border border-primary/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-sm font-bold tracking-wider uppercase text-primary">الأصدقاء</h2>
        {pendingReceived.length > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
            {pendingReceived.length}
          </span>
        )}
      </div>

      <Tabs defaultValue="friends" className="w-full" dir="rtl">
        <TabsList className="w-full bg-muted/30 border border-primary/10">
          <TabsTrigger value="friends" className="flex-1 text-xs data-[state=active]:bg-primary/20">
            الأصدقاء ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="received" className="flex-1 text-xs data-[state=active]:bg-primary/20 relative">
            الطلبات ({pendingReceived.length})
            {pendingReceived.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex-1 text-xs data-[state=active]:bg-primary/20">
            المرسلة ({pendingSent.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-3 space-y-2">
          {friends.length === 0 ? (
            <EmptyState message="لا يوجد أصدقاء بعد. ابحث عن لاعبين وأضفهم!" />
          ) : (
            friends.map(f => <FriendCard key={f.friendship_id} friend={f} type="friend" />)
          )}
        </TabsContent>

        <TabsContent value="received" className="mt-3 space-y-2">
          {pendingReceived.length === 0 ? (
            <EmptyState message="لا توجد طلبات صداقة واردة" />
          ) : (
            pendingReceived.map(f => <FriendCard key={f.friendship_id} friend={f} type="received" />)
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-3 space-y-2">
          {pendingSent.length === 0 ? (
            <EmptyState message="لم ترسل أي طلبات صداقة" />
          ) : (
            pendingSent.map(f => <FriendCard key={f.friendship_id} friend={f} type="sent" />)
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
};

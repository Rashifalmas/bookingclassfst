'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  MapPin,
} from 'lucide-react';
import type { RoomFacility } from '@/lib/types/database';
import { ALL_FACILITIES } from '@/lib/types/database';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function RoomsPage() {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<RoomFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoomFacility | null>(null);
  const [form, setForm] = useState({
    room_code: '',
    room_name: '',
    capacity: 30,
    floor: 'Lt.1',
    facilities: [] as string[],
    is_active: true,
  });

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('room_facilities')
      .select('*')
      .order('room_code');
    setRooms((data ?? []) as RoomFacility[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      room_code: '',
      room_name: '',
      capacity: 30,
      floor: 'Lt.1',
      facilities: [],
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (room: RoomFacility) => {
    setEditing(room);
    setForm({
      room_code: room.room_code,
      room_name: room.room_name,
      capacity: room.capacity,
      floor: room.floor,
      facilities: room.facilities,
      is_active: room.is_active,
    });
    setDialogOpen(true);
  };

  const toggleFacility = (f: string) => {
    setForm((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(f)
        ? prev.facilities.filter((x) => x !== f)
        : [...prev.facilities, f],
    }));
  };

  const save = async () => {
    const supabase = createClient();
    if (editing) {
      const { error } = await supabase
        .from('room_facilities')
        .update({
          room_name: form.room_name,
          capacity: form.capacity,
          floor: form.floor,
          facilities: form.facilities,
          is_active: form.is_active,
        })
        .eq('room_id', editing.room_id);
      if (error) {
        toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Room updated' });
    } else {
      const { error } = await supabase.from('room_facilities').insert({
        room_code: form.room_code,
        room_name: form.room_name,
        capacity: form.capacity,
        floor: form.floor,
        facilities: form.facilities,
        is_active: form.is_active,
      });
      if (error) {
        toast({ title: 'Create failed', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Room created' });
    }
    setDialogOpen(false);
    load();
  };

  const remove = async (room: RoomFacility) => {
    if (!confirm(`Delete room ${room.room_code}? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('room_facilities')
      .delete()
      .eq('room_id', room.room_id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Room deleted' });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Room Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage campus rooms, capacities, and facilities
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Room
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Card key={room.room_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{room.room_code}</p>
                      <p className="text-xs text-muted-foreground">{room.room_name}</p>
                    </div>
                  </div>
                  <Badge variant={room.is_active ? 'default' : 'secondary'}>
                    {room.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Capacity: <span className="font-medium text-foreground">{room.capacity}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {room.floor}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {room.facilities.map((f) => (
                    <Badge key={f} variant="outline" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>

                <div className="mt-4 flex gap-2 border-t pt-4">
                  <Button size="sm" variant="outline" onClick={() => openEdit(room)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(room)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Room' : 'Add New Room'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update room details below.'
                : 'Fill in the details for the new room.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="room_code">Room Code</Label>
                <Input
                  id="room_code"
                  placeholder="A.301"
                  value={form.room_code}
                  onChange={(e) => setForm({ ...form, room_code: e.target.value })}
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  placeholder="Lt.3"
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="room_name">Room Name</Label>
              <Input
                id="room_name"
                placeholder="Ruang Kuliah A.301"
                value={form.room_name}
                onChange={(e) => setForm({ ...form, room_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Facilities</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_FACILITIES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFacility(f)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      form.facilities.includes(f)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.is_active ? 'active' : 'inactive'}
                onValueChange={(v) => setForm({ ...form, is_active: v === 'active' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!form.room_code || !form.room_name}>
              {editing ? 'Save Changes' : 'Create Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

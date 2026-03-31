"use client";

import { useState } from "react";
import {
  useSupplierTeam,
  useAddSupplierStaff,
  useUpdateSupplierStaff,
  useRemoveSupplierStaff,
} from "@/hooks/use-supplier-team";
import { useSupplierSettings } from "@/hooks/use-supplier-settings";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users2,
  UserPlus,
  Loader2,
  Pencil,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";

export default function SupplierTeamPage() {
  const { data, isLoading } = useSupplierTeam();
  const { data: settingsData } = useSupplierSettings();
  const isAdmin = settingsData?.data?.userRole === "SUPPLIER_ADMIN";
  const addStaff = useAddSupplierStaff();
  const updateStaff = useUpdateSupplierStaff();
  const removeStaff = useRemoveSupplierStaff();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"SUPPLIER_ADMIN" | "SUPPLIER_REP">("SUPPLIER_REP");

  const members = data?.data || [];

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRole("SUPPLIER_REP");
  }

  async function handleAdd() {
    await addStaff.mutateAsync({ firstName, lastName, email, phone, role });
    resetForm();
    setAddOpen(false);
  }

  async function handleUpdate() {
    if (!editMember) return;
    await updateStaff.mutateAsync({
      id: editMember.id,
      data: { firstName, lastName, phone, role },
    });
    setEditOpen(false);
    setEditMember(null);
  }

  async function handleRemove(id: string) {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    await removeStaff.mutateAsync(id);
  }

  function openEdit(member: any) {
    setEditMember(member);
    setFirstName(member.firstName || "");
    setLastName(member.lastName || "");
    setPhone(member.phone || "");
    setRole(member.role);
    setEditOpen(true);
  }

  const handleTransferOwnership = async () => {
    if (!transferTargetId) return;
    try {
      await apiFetch("/api/supplier/team/transfer-ownership", {
        method: "POST",
        body: JSON.stringify({ targetUserId: transferTargetId }),
      });
      setShowTransferDialog(false);
      setTransferTargetId("");
      toast({ title: "Ownership transferred successfully" });
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Transfer failed", description: err?.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Manage your supplier team members</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setShowTransferDialog(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer Ownership
            </Button>
          )}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your supplier team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPPLIER_ADMIN">Admin</SelectItem>
                    <SelectItem value="SUPPLIER_REP">Rep</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!firstName || !email || addStaff.isPending}>
                {addStaff.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Team Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No team members yet. Add your first team member above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member: any) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.firstName} {member.lastName || ""}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={member.role === "SUPPLIER_ADMIN" ? "default" : "secondary"}>
                        {member.role === "SUPPLIER_ADMIN" ? "Admin" : "Rep"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.isPending ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPPLIER_ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPPLIER_REP">Rep</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!firstName || updateStaff.isPending}>
              {updateStaff.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
            <DialogDescription>
              Transfer admin ownership to another team member. You will be
              demoted to a Rep role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Admin Owner</Label>
              <Select
                value={transferTargetId}
                onValueChange={setTransferTargetId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter((m: any) => m.role !== "SUPPLIER_ADMIN")
                    .map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.firstName} {m.lastName || ""} ({m.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-destructive">
              This action cannot be undone. The new admin will have full control
              over the supplier account.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTransferDialog(false);
                setTransferTargetId("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTransferOwnership}
              disabled={!transferTargetId}
            >
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useTeamMembers, useAddStaffMember, useRemoveStaffMember } from "@/hooks/use-team";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Loader2, Plus, Mail, X, ShieldAlert, ArrowRightLeft } from "lucide-react";

export default function TeamPage() {
  const { data: settingsData } = useSettings();
  const isAdmin = ["OWNER", "MANAGER", "ORG_ADMIN"].includes(settingsData?.data?.user?.role ?? "");

  if (!isAdmin) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">You don&apos;t have permission to manage team members.</p>
      </div>
    );
  }

  return <TeamContent />;
}

function TeamContent() {
  const { data: teamData, isLoading } = useTeamMembers();
  const addMember = useAddStaffMember();
  const removeMember = useRemoveStaffMember();
  const { data: settingsData } = useSettings();
  const isOwner = settingsData?.data?.user?.role === "OWNER";
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [newMember, setNewMember] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "STAFF" as "MANAGER" | "STAFF",
  });
  const { toast } = useToast();

  const members = teamData?.data || [];

  const handleAdd = async () => {
    try {
      await addMember.mutateAsync({
        firstName: newMember.firstName,
        lastName: newMember.lastName || undefined,
        email: newMember.email,
        phone: newMember.phone || undefined,
        role: newMember.role,
      });
      setShowAddDialog(false);
      setNewMember({ firstName: "", lastName: "", email: "", phone: "", role: "STAFF" });
      toast({ title: "Team member added and invitation sent" });
    } catch (err: any) {
      toast({
        title: "Failed to add team member",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferTargetId) return;
    try {
      await apiFetch("/api/team/transfer-ownership", {
        method: "POST",
        body: JSON.stringify({ targetUserId: transferTargetId }),
      });
      setShowTransferDialog(false);
      setTransferTargetId("");
      toast({ title: "Ownership transferred successfully" });
      // Reload to reflect new roles
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Transfer failed", description: err?.message, variant: "destructive" });
    }
  };

  const handleRemove = async (id: string, name: string) => {
    try {
      await removeMember.mutateAsync(id);
      toast({ title: `${name} removed from team` });
    } catch (err: any) {
      toast({
        title: "Failed to remove member",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your restaurant staff and their roles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button variant="outline" onClick={() => setShowTransferDialog(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer Ownership
            </Button>
          )}
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No team members yet. Add your first staff member to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {member.firstName?.charAt(0)?.toUpperCase() || member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {member.firstName} {member.lastName || ""}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                        {member.isPending && (
                          <Badge variant="secondary" className="text-xs">
                            <Mail className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  {member.role !== "OWNER" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleRemove(
                          member.id,
                          `${member.firstName || ""} ${member.lastName || ""}`.trim()
                        )
                      }
                      disabled={removeMember.isPending}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a new staff member to your restaurant. They&apos;ll receive an email invitation to join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memberFirstName">First Name *</Label>
                <Input
                  id="memberFirstName"
                  value={newMember.firstName}
                  onChange={(e) =>
                    setNewMember({ ...newMember, firstName: e.target.value })
                  }
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberLastName">Last Name</Label>
                <Input
                  id="memberLastName"
                  value={newMember.lastName}
                  onChange={(e) =>
                    setNewMember({ ...newMember, lastName: e.target.value })
                  }
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberEmail">Email *</Label>
              <Input
                id="memberEmail"
                type="email"
                value={newMember.email}
                onChange={(e) =>
                  setNewMember({ ...newMember, email: e.target.value })
                }
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberPhone">Phone</Label>
              <Input
                id="memberPhone"
                value={newMember.phone}
                onChange={(e) =>
                  setNewMember({ ...newMember, phone: e.target.value })
                }
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberRole">Role</Label>
              <Select
                value={newMember.role}
                onValueChange={(value) =>
                  setNewMember({ ...newMember, role: value as "MANAGER" | "STAFF" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!newMember.firstName || !newMember.email || addMember.isPending}
            >
              {addMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
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
              Transfer restaurant ownership to another team member. You will be
              demoted to a Manager role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Owner</Label>
              <Select
                value={transferTargetId}
                onValueChange={setTransferTargetId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter((m: any) => m.role !== "OWNER")
                    .map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.firstName} {m.lastName || ""} ({m.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-destructive">
              This action cannot be undone. The new owner will have full control
              over the restaurant account.
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

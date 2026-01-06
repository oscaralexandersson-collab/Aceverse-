
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Workspace, WorkspaceMember } from '../types';
import { db } from '../services/db';
import { supabase } from '../services/supabase';

// 'personal' = Data kopplad till User ID (workspace_id IS NULL)
// 'workspace' = Data kopplad till Workspace ID
export type ViewScope = 'personal' | 'workspace';

interface WorkspaceContextType {
  viewScope: ViewScope;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  members: WorkspaceMember[];
  isLoading: boolean;
  switchScope: (scope: ViewScope, workspaceId?: string) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  inviteMember: (email: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [viewScope, setViewScope] = useState<ViewScope>('personal'); // Default till personal
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refreshWorkspaces();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') refreshWorkspaces();
      if (event === 'SIGNED_OUT') {
        setWorkspaces([]);
        setActiveWorkspace(null);
        setViewScope('personal');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshWorkspaces = async () => {
    setIsLoading(true);
    try {
      const user = await db.getCurrentUser();
      if (!user) return;

      const { data: memberRows, error } = await supabase
        .from('workspace_members')
        .select('workspace:workspaces(*), role')
        .eq('user_id', user.id);

      if (error) throw error;

      // Filter out any potential nulls if join failed due to RLS
      const wsList = (memberRows || [])
        .map((row: any) => row.workspace ? ({
            ...row.workspace,
            role: row.role
        }) : null)
        .filter((w): w is Workspace => w !== null);

      // Fetch member counts for all workspaces in the list
      if (wsList.length > 0) {
          const ids = wsList.map(w => w.id);
          // Query workspace_members for these workspaces to get total count
          // Using a separate query to avoid complex grouping on client if list is large, 
          // but for small lists this is fine. RLS allows viewing members of own workspaces.
          const { data: allMembers } = await supabase
              .from('workspace_members')
              .select('workspace_id')
              .in('workspace_id', ids);
          
          const counts: Record<string, number> = {};
          allMembers?.forEach(m => {
              counts[m.workspace_id] = (counts[m.workspace_id] || 0) + 1;
          });
          
          wsList.forEach(w => {
              w.memberCount = counts[w.id] || 0;
          });
      }

      setWorkspaces(wsList);

      // Auto-select logic
      if (viewScope === 'workspace' && activeWorkspace) {
          const updated = wsList.find(w => w.id === activeWorkspace.id);
          if (updated) {
              setActiveWorkspace(updated);
          } else {
              // Workspace removed/lost access -> Fallback to personal
              setViewScope('personal');
              setActiveWorkspace(null);
          }
      }

    } catch (err: any) {
      console.error("Workspace sync failed:", err.message || err);
      // Alert user if critical configuration error occurs
      if (err.message?.includes("infinite recursion")) {
          alert("DATABASE CONFIG ERROR: 'Infinite Recursion' detected.\n\nPlease run the SQL fix provided in the chat to resolve the RLS policy loop.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch members when active workspace changes
  useEffect(() => {
    if (viewScope === 'workspace' && activeWorkspace) {
      const fetchMembers = async () => {
        try {
            // 1. Fetch raw members first (avoiding JOIN error)
            const { data: memberRows, error: memberError } = await supabase
                .from('workspace_members')
                .select('*')
                .eq('workspace_id', activeWorkspace.id);
            
            if (memberError) throw memberError;

            if (!memberRows || memberRows.length === 0) {
                setMembers([]);
                return;
            }

            // 2. Fetch profiles for these members manually
            const userIds = memberRows.map(m => m.user_id);
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', userIds);
            
            if (profileError) {
                console.warn("Could not fetch profiles for members:", profileError.message);
                // Continue with just member data if profiles fail
            }

            // 3. Merge data in memory
            const joinedMembers = memberRows.map(member => ({
                ...member,
                user: profiles?.find(p => p.id === member.user_id)
            }));

            setMembers(joinedMembers as any);

        } catch (err: any) {
            console.error("Failed to fetch members:", err.message);
        }
      };
      fetchMembers();
    } else {
        setMembers([]);
    }
  }, [activeWorkspace, viewScope]);

  const switchScope = (scope: ViewScope, workspaceId?: string) => {
      setViewScope(scope);
      if (scope === 'workspace' && workspaceId) {
          const ws = workspaces.find(w => w.id === workspaceId);
          if (ws) setActiveWorkspace(ws);
      } else {
          setActiveWorkspace(null);
      }
  };

  const createWorkspace = async (name: string) => {
      const user = await db.getCurrentUser();
      if (!user) throw new Error("Du måste vara inloggad.");
      const ws = await db.createWorkspace(user.id, name);
      await refreshWorkspaces();
      switchScope('workspace', ws.id);
  };

  const inviteMember = async (email: string) => {
      if (!activeWorkspace) throw new Error("Inget team valt.");
      await db.inviteMemberByEmail(activeWorkspace.id, email);
      // Trigger refresh of members
      const user = await db.getCurrentUser();
      // Re-trigger effect by shallow updating activeWorkspace
      if(activeWorkspace) setActiveWorkspace({...activeWorkspace});
      // Also refresh to update counts
      await refreshWorkspaces();
  };

  const deleteWorkspace = async (workspaceId: string) => {
      await db.deleteWorkspace(workspaceId);
      await refreshWorkspaces();
      if (viewScope === 'workspace' && activeWorkspace?.id === workspaceId) {
          switchScope('personal');
      }
  };

  return (
    <WorkspaceContext.Provider value={{ 
      viewScope,
      workspaces, 
      activeWorkspace, 
      members, 
      isLoading, 
      switchScope,
      refreshWorkspaces,
      createWorkspace,
      inviteMember,
      deleteWorkspace
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

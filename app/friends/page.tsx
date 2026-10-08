'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft,
  Check,
  Clock3,
  Loader2,
  Search,
  Share2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { FriendChecklist } from '@/components/FriendChecklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import type {
  FriendProfile,
  FriendRequest,
  ShareableCategory,
  SharedTask,
  UserSearchResult,
} from '@/lib/social/types';

export default function FriendsPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [sharedTasks, setSharedTasks] = useState<SharedTask[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareCategories, setShareCategories] = useState<ShareableCategory[]>([]);
  const [selectedShareIds, setSelectedShareIds] = useState<string[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [savingShares, setSavingShares] = useState(false);

  const loadSocialData = async () => {
    const [{ data: friendData, error: friendError }, { data: requestData, error: requestError }] =
      await Promise.all([
        supabase.rpc('get_friends'),
        supabase.rpc('get_friend_requests'),
      ]);

    if (friendError || requestError) {
      setBackendReady(false);
      return;
    }

    setFriends((friendData || []) as FriendProfile[]);
    setRequests((requestData || []) as FriendRequest[]);
  };

  const initialize = async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setLoading(false);
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', authData.user.id)
      .single();

    if (error) {
      setBackendReady(false);
      setLoading(false);
      return;
    }

    setUsername(profile?.username || null);
    if (profile?.username) await loadSocialData();
    setLoading(false);
  };

  useEffect(() => {
    initialize();
  }, []);

  const handleSetUsername = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = newUsername.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(normalized)) {
      toast.error('Use 3-24 letters, numbers, or underscores');
      return;
    }

    const { error } = await supabase.rpc('set_username', {
      requested_username: normalized,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setUsername(normalized);
    setNewUsername('');
    toast.success('Username saved');
    await loadSocialData();
  };

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 3) {
      toast.error('Enter at least 3 characters');
      return;
    }

    setSearching(true);
    const { data, error } = await supabase.rpc('search_profiles', {
      search_term: query,
    });
    setSearching(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSearchResults((data || []) as UserSearchResult[]);
  };

  const handleSendRequest = async (result: UserSearchResult) => {
    const { error } = await supabase.rpc('send_friend_request', {
      target_username: result.username,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Friend request sent');
    setSearchResults((current) =>
      current.map((item) =>
        item.user_id === result.user_id ? { ...item, relationship: 'pending' } : item
      )
    );
    await loadSocialData();
  };

  const handleRespond = async (requestId: string, accept: boolean) => {
    const { error } = await supabase.rpc('respond_to_friend_request', {
      request_id: requestId,
      accept_request: accept,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(accept ? 'Friend added' : 'Request declined');
    await loadSocialData();
  };

  const handleSelectFriend = async (friend: FriendProfile) => {
    setSelectedFriend(friend);
    setLoadingChecklist(true);
    const { data, error } = await supabase.rpc('get_friend_checklist', {
      target_friend_id: friend.friend_id,
    });
    setLoadingChecklist(false);

    if (error) {
      toast.error(error.message);
      setSharedTasks([]);
      return;
    }

    setSharedTasks((data || []) as SharedTask[]);
  };

  const handleRemoveFriend = async (friend: FriendProfile) => {
    if (!window.confirm('Remove this friend? You will no longer be able to view each other\'s checklists.')) {
      return;
    }

    const { error } = await supabase.rpc('remove_friend', {
      target_friend_id: friend.friend_id,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    if (selectedFriend?.friend_id === friend.friend_id) {
      setSelectedFriend(null);
      setSharedTasks([]);
    }
    toast.success('Friend removed');
    await loadSocialData();
  };

  const handleOpenShareDialog = async (friend: FriendProfile) => {
    setShareDialogOpen(true);
    setLoadingShares(true);
    const { data, error } = await supabase.rpc('get_shareable_categories', {
      target_friend_id: friend.friend_id,
    });
    setLoadingShares(false);

    if (error) {
      toast.error(error.message);
      setShareDialogOpen(false);
      return;
    }

    const categories = (data || []) as ShareableCategory[];
    setShareCategories(categories);
    setSelectedShareIds(
      categories.filter((category) => category.shared).map((category) => category.category_id)
    );
  };

  const handleToggleSharedCategory = (categoryId: string, checked: boolean) => {
    setSelectedShareIds((current) =>
      checked
        ? Array.from(new Set([...current, categoryId]))
        : current.filter((id) => id !== categoryId)
    );
  };

  const handleSaveShares = async () => {
    if (!selectedFriend) return;
    setSavingShares(true);
    const { error } = await supabase.rpc('set_shared_categories', {
      target_friend_id: selectedFriend.friend_id,
      shared_category_ids: selectedShareIds,
    });
    setSavingShares(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      selectedShareIds.length > 0
        ? 'Shared categories updated'
        : 'Checklist sharing turned off'
    );
    setShareDialogOpen(false);
  };

  const incomingRequests = requests.filter((request) => request.direction === 'incoming');
  const outgoingRequests = requests.filter((request) => request.direction === 'outgoing');

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] overflow-y-auto pb-24 md:h-screen md:pb-0">
        <div className="mx-auto max-w-7xl p-4 md:p-7">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="eyebrow mb-1.5">Your network</div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Friends</h1>
              <p className="mt-1 text-sm text-slate-500">
                Share progress while keeping every checklist read-only.
              </p>
            </div>
            {username && (
              <div className="hidden rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2 text-xs text-slate-400 sm:block">
                @{username}
              </div>
            )}
          </div>

          {loading ? (
            <div className="surface-card flex min-h-[420px] items-center justify-center rounded-2xl text-sm text-slate-500">
              Loading friends...
            </div>
          ) : !backendReady ? (
            <div className="surface-card mx-auto max-w-xl rounded-2xl p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10">
                <Users className="h-5 w-5 text-indigo-300" />
              </div>
              <h2 className="text-xl font-bold text-white">Friends backend is ready to connect</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                The interface and secure database migration are implemented locally. Apply the friends migration when you are ready to enable usernames, requests, and shared checklists.
              </p>
              <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 font-mono text-[11px] text-slate-500">
                20261008010000_add_friends_and_readonly_sharing.sql
              </div>
            </div>
          ) : !username ? (
            <div className="surface-card mx-auto max-w-lg rounded-2xl p-6 sm:p-8">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10">
                <UserPlus className="h-5 w-5 text-indigo-300" />
              </div>
              <div className="eyebrow mb-2">Set up your profile</div>
              <h2 className="text-xl font-bold text-white">Choose a username</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Friends will use this to find you. Your email stays private.
              </p>
              <form onSubmit={handleSetUsername} className="mt-6 flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-600">@</span>
                  <Input
                    value={newUsername}
                    onChange={(event) => setNewUsername(event.target.value)}
                    placeholder="your_username"
                    className="glass-input h-11 pl-8 text-white placeholder:text-slate-600"
                  />
                </div>
                <Button type="submit" className="btn-gradient h-11">Save</Button>
              </form>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)]">
              <aside className="space-y-5">
                {incomingRequests.length > 0 && (
                  <section className="surface-card rounded-2xl p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-white">Requests</h2>
                      <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                        {incomingRequests.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {incomingRequests.map((request) => (
                        <div key={request.request_id} className="rounded-xl border border-slate-800/70 bg-slate-950/30 p-3">
                          <div className="text-sm font-semibold text-slate-200">{request.display_name}</div>
                          <div className="text-xs text-slate-600">@{request.username}</div>
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" onClick={() => handleRespond(request.request_id, true)} className="btn-gradient h-8 flex-1 text-xs">
                              <Check className="mr-1 h-3.5 w-3.5" />Accept
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleRespond(request.request_id, false)} className="h-8 text-xs text-slate-400 hover:bg-white/[0.05] hover:text-white">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="surface-card rounded-2xl p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">Your friends</h2>
                    <span className="text-xs text-slate-600">{friends.length}</span>
                  </div>
                  {friends.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800 py-7 text-center text-xs text-slate-600">
                      Find someone to get started
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {friends.map((friend) => (
                        <button
                          key={friend.friend_id}
                          onClick={() => handleSelectFriend(friend)}
                          className={
                            selectedFriend?.friend_id === friend.friend_id
                              ? 'flex w-full items-center gap-3 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-3 py-2.5 text-left'
                              : 'flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left hover:bg-white/[0.04]'
                          }
                        >
                          <span className="btn-gradient flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase">
                            {friend.display_name.slice(0, 1)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-200">{friend.display_name}</span>
                            <span className="block truncate text-[11px] text-slate-600">@{friend.username}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {outgoingRequests.length > 0 && (
                  <section className="surface-card rounded-2xl p-4">
                    <h2 className="mb-3 text-sm font-semibold text-white">Pending</h2>
                    <div className="space-y-2">
                      {outgoingRequests.map((request) => (
                        <div key={request.request_id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span className="truncate">@{request.username}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </aside>

              <main className="min-w-0">
                {selectedFriend ? (
                  <div>
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedFriend(null)} className="text-slate-400 hover:bg-white/[0.04] hover:text-white lg:hidden">
                        <ArrowLeft className="mr-2 h-4 w-4" />Back
                      </Button>
                      <Button size="sm" onClick={() => handleOpenShareDialog(selectedFriend)} className="btn-gradient ml-auto">
                        <Share2 className="mr-2 h-4 w-4" />Share my checklist
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveFriend(selectedFriend)} className="text-slate-500 hover:bg-red-500/10 hover:text-red-400">
                        <UserMinus className="mr-2 h-4 w-4" />Remove friend
                      </Button>
                    </div>
                    <FriendChecklist friend={selectedFriend} tasks={sharedTasks} loading={loadingChecklist} />
                  </div>
                ) : (
                  <div className="space-y-5">
                    <section className="surface-card rounded-2xl p-5 sm:p-6">
                      <div className="eyebrow mb-2">Find friends</div>
                      <h2 className="text-xl font-bold text-white">Search by username</h2>
                      <p className="mt-1 text-sm text-slate-500">Only usernames and display names are searchable.</p>
                      <form onSubmit={handleSearch} className="mt-5 flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                          <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search usernames..." className="glass-input h-11 pl-10 text-white placeholder:text-slate-600" />
                        </div>
                        <Button type="submit" disabled={searching} className="btn-gradient h-11 px-5">
                          {searching ? 'Searching...' : 'Search'}
                        </Button>
                      </form>
                    </section>

                    {searchResults.length > 0 && (
                      <section className="surface-card overflow-hidden rounded-2xl">
                        <div className="border-b border-slate-800/70 px-5 py-4 text-sm font-semibold text-white">Results</div>
                        <div className="divide-y divide-slate-800/60">
                          {searchResults.map((result) => (
                            <div key={result.user_id} className="flex items-center gap-3 px-5 py-4">
                              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold uppercase text-slate-300">
                                {result.display_name.slice(0, 1)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-slate-200">{result.display_name}</div>
                                <div className="truncate text-xs text-slate-600">@{result.username}</div>
                              </div>
                              {result.relationship === 'none' ? (
                                <Button size="sm" onClick={() => handleSendRequest(result)} className="btn-gradient h-9">
                                  <UserPlus className="mr-2 h-4 w-4" />Add
                                </Button>
                              ) : (
                                <span className="rounded-full border border-slate-700/70 bg-slate-800/50 px-3 py-1 text-[11px] font-semibold capitalize text-slate-500">
                                  {result.relationship}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {searchResults.length === 0 && (
                      <div className="surface-card flex min-h-[260px] flex-col items-center justify-center rounded-2xl text-center">
                        <Users className="mb-3 h-8 w-8 text-slate-700" />
                        <p className="font-semibold text-slate-300">Your shared workspace starts here</p>
                        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">
                          Search for a username, send a request, and view each other&apos;s progress once it is accepted.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      </div>
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="glass-panel max-h-[85vh] overflow-y-auto border-slate-700/70 bg-[#101827] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Share my checklist</DialogTitle>
            <DialogDescription className="leading-6 text-slate-400">
              Choose which categories {selectedFriend?.display_name || 'this friend'} can view. They can see completion status and streaks, but cannot make changes.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {loadingShares ? (
              <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading categories...
              </div>
            ) : shareCategories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700/70 px-4 py-8 text-center text-sm text-slate-500">
                Create a checklist category before sharing.
              </div>
            ) : (
              <div className="space-y-2">
                {shareCategories.map((category) => {
                  const checked = selectedShareIds.includes(category.category_id);
                  return (
                    <label
                      key={category.category_id}
                      className={
                        checked
                          ? 'flex cursor-pointer items-center gap-3 rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-4 py-3'
                          : 'flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/25 px-4 py-3 hover:bg-white/[0.03]'
                      }
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          handleToggleSharedCategory(category.category_id, value === true)
                        }
                        className="border-slate-600 data-[state=checked]:border-transparent data-[state=checked]:bg-indigo-500"
                      />
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: category.category_color || '#64748b' }}
                      />
                      <span className="flex-1 text-sm font-medium text-slate-200">
                        {category.category_name}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                        {checked ? 'Shared' : 'Private'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShareDialogOpen(false)}
              className="glass-input text-slate-300 hover:bg-white/[0.05] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveShares}
              disabled={loadingShares || savingShares || shareCategories.length === 0}
              className="btn-gradient"
            >
              {savingShares ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save sharing'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster theme="dark" />
    </AppLayout>
  );
}

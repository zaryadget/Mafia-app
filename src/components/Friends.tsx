import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, UserPlus, Users, ArrowLeft, Send } from 'lucide-react';

interface FriendsProps {
  user: any;
  onBack: () => void;
}

export default function Friends({ user, onBack }: FriendsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, [user.id]);

  const fetchFriends = async () => {
    try {
      const res = await fetch(`/api/friends/${user.id}`);
      const data = await res.json();
      setFriends(data.friends || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/friends/search?query=${query}`);
      const data = await res.json();
      setSearchResults(data.results.filter((r: any) => r.id !== user.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (friendId: number) => {
    try {
      await fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId })
      });
      fetchFriends();
      setSearchQuery('');
      setSearchResults([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInvite = () => {
    const botUrl = 'https://t.me/your_bot_username'; // Replace with actual bot URL
    const text = `Привет! Добавляйся ко мне в Mafia, чтобы играть вместе. Мой код друга: ${user.id}. Ссылка: ${botUrl}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${encodeURIComponent(text)}`;
    
    // If inside Telegram WebApp, use its native method if possible, otherwise open link
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-slate-900 text-white p-6"
    >
      <div className="max-w-md mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Назад
        </button>

        <h1 className="text-3xl font-bold mb-2">Друзья</h1>
        <p className="text-slate-400 mb-8">Ваш код друга: <span className="text-indigo-400 font-mono bg-indigo-500/10 px-2 py-1 rounded">{user.id}</span></p>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск по ID или Username..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {searchQuery.length >= 2 && (
          <div className="bg-slate-800 rounded-2xl p-4 mb-8">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Результаты поиска</h2>
            {loading ? (
              <div className="text-center text-slate-500 py-4">Поиск...</div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map(result => (
                  <div key={result.id} className="flex items-center justify-between bg-slate-900 p-4 rounded-xl">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center mr-3">
                        <UserPlus className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <div className="font-medium">{result.username}</div>
                        <div className="text-xs text-slate-500">ID: {result.id}</div>
                      </div>
                    </div>
                    {friends.some(f => f.id === result.id) ? (
                      <span className="text-emerald-400 text-sm font-medium">В друзьях</span>
                    ) : (
                      <button 
                        onClick={() => handleAddFriend(result.id)}
                        className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Добавить
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-400 mb-4">Пользователь не найден</p>
                <button 
                  onClick={handleInvite}
                  className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center mx-auto w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Пригласить друга в Mafia
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Мои друзья ({friends.length})
          </h2>
          
          {friends.length === 0 ? (
            <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-700 border-dashed">
              <p className="text-slate-500">У вас пока нет друзей в игре.</p>
              <p className="text-slate-500 text-sm mt-1">Найдите их по ID или пригласите!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map(friend => (
                <div key={friend.id} className="flex items-center bg-slate-800 p-4 rounded-xl border border-slate-700/50">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mr-3">
                    <span className="text-emerald-400 font-bold">{friend.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="font-medium">{friend.username}</div>
                    <div className="text-xs text-slate-500">ID: {friend.id}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

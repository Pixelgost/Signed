import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Send, ArrowLeft } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  company: string;
  jobTitle: string;
  companyLogo?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: Message[];
}

interface MessagesScreenProps {
  onBack?: () => void;
}

export function MessagesScreen({ onBack }: MessagesScreenProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const conversations: Conversation[] = [
    {
      id: '1',
      company: 'TechFlow',
      jobTitle: 'Frontend Developer Intern',
      companyLogo: "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wYW55JTIwbG9nbyUyMGRlc2lnbnxlbnwxfHx8fDE3NTc0Mzc1NDV8MA&ixlib=rb-4.1.0&q=80&w=1080",
      lastMessage: 'We\'d love to schedule an interview with you!',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      unreadCount: 2,
      messages: [
        {
          id: '1',
          senderId: 'company',
          text: 'Hi Alex! We reviewed your profile and we\'re impressed. We\'d love to schedule an interview with you!',
          timestamp: new Date(Date.now() - 1000 * 60 * 30)
        }
      ]
    },
    {
      id: '2',
      company: 'DataVision',
      jobTitle: 'Data Science Intern',
      companyLogo: "https://images.unsplash.com/photo-1657885428127-38a40be4e232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wYW55JTIwbG9nbyUyMGRlc2lnbnxlbnwxfHx8fDE3NTc0Mzc1NDV8MA&ixlib=rb-4.1.0&q=80&w=1080",
      lastMessage: 'Thanks for your interest! What questions do you have about the role?',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      unreadCount: 0,
      messages: [
        {
          id: '1',
          senderId: 'user',
          text: 'Hi! I\'m really excited about this opportunity. Could you tell me more about the team I\'d be working with?',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3)
        },
        {
          id: '2',
          senderId: 'company',
          text: 'Thanks for your interest! What questions do you have about the role?',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
        }
      ]
    }
  ];

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // In a real app, this would send the message to the backend
    console.log('Sending message:', newMessage);
    setNewMessage('');
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  if (selectedConversation && selectedConv) {
    return (
      <div className="w-full max-w-md mx-auto h-full flex flex-col">
        {/* Conversation Header */}
        <div className="bg-background border-b border-border p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedConversation(null)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <ImageWithFallback
              src={selectedConv.companyLogo}
              alt={`${selectedConv.company} logo`}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1">
            <h3 className="font-medium">{selectedConv.company}</h3>
            <p className="text-sm text-muted-foreground">{selectedConv.jobTitle}</p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {selectedConv.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.senderId === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.senderId === 'user' 
                      ? 'text-primary-foreground/70' 
                      : 'text-muted-foreground'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button 
              size="icon"
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-20">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-1">Messages</h1>
        <p className="text-muted-foreground">Chat with companies you've matched with</p>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">No messages yet</p>
          <p className="text-sm text-muted-foreground">Start swiping to connect with companies!</p>
        </div>
      ) : (
        <div className="space-y-2 px-4">
          {conversations.map((conversation) => (
            <Card
              key={conversation.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedConversation(conversation.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={conversation.companyLogo}
                      alt={`${conversation.company} logo`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">{conversation.company}</h3>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatTime(conversation.lastMessageTime)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-1 truncate">
                      {conversation.jobTitle}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground truncate flex-1">
                        {conversation.lastMessage}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
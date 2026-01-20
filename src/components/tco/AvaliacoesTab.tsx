import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface Review {
  id: string;
  stars: number;
  text: string;
  date: string;
}

interface AvaliacoesTabProps {
  reviews: Review[];
  onOpenFeedback: () => void;
}

const AvaliacoesTab: React.FC<AvaliacoesTabProps> = ({ reviews, onOpenFeedback }) => {
  // Ordenar da mais recente para a mais antiga
  const sortedReviews = [...reviews].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Feedback</CardTitle>
        <button className="btn-primary text-sm px-4 py-2" onClick={onOpenFeedback}>
          <i className="fas fa-plus mr-2"></i>
          Envie um feedback
        </button>
      </CardHeader>
      <CardContent>
        {sortedReviews.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <i className="fas fa-comment-slash text-4xl mb-2"></i>
            <p>Nenhuma avaliação recebida ainda.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {sortedReviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback><i className="fas fa-user"></i></AvatarFallback>
                      </Avatar>
                      <div className="text-sm font-medium">Anônimo</div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <i
                        key={i}
                        className={`fas fa-star text-xs ${
                          i < review.stars ? "text-yellow-500" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/90">{review.text}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AvaliacoesTab;

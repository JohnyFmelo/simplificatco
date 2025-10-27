import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Server, Users } from "lucide-react";

const TCODashboard = () => {
  const metrics = [
    {
      title: "Custo Total",
      value: "R$ 0,00",
      description: "Custo total de propriedade",
      icon: DollarSign,
      trend: "+0%",
    },
    {
      title: "Infraestrutura",
      value: "R$ 0,00",
      description: "Custos de infraestrutura",
      icon: Server,
      trend: "+0%",
    },
    {
      title: "Licenças",
      value: "R$ 0,00",
      description: "Custos de licenciamento",
      icon: Users,
      trend: "+0%",
    },
    {
      title: "Crescimento",
      value: "0%",
      description: "Variação mensal",
      icon: TrendingUp,
      trend: "0%",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            TCO Dashboard
          </h1>
          <p className="text-lg text-muted-foreground animate-in fade-in slide-in-from-bottom-5 duration-700">
            Total Cost of Ownership - Visão completa dos seus custos
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card
                key={metric.title}
                className="border-border/50 shadow-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-6 group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </CardTitle>
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:from-primary/20 group-hover:to-accent/20 transition-colors duration-300">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                    {metric.value}
                  </div>
                  <CardDescription className="text-xs flex items-center gap-2">
                    <span>{metric.description}</span>
                    <span className="text-primary font-medium">{metric.trend}</span>
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Description Card */}
        <Card className="mt-8 md:mt-12 border-border/50 shadow-card animate-in fade-in slide-in-from-bottom-8 duration-700">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Sobre o TCO</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              O <span className="font-semibold text-foreground">Total Cost of Ownership (TCO)</span> é uma estimativa financeira 
              que ajuda empresas a determinar os custos diretos e indiretos de um produto ou sistema. 
              Este dashboard centraliza todas as informações de custos, incluindo infraestrutura, 
              licenciamento, manutenção e operação, permitindo uma visão holística do investimento total.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TCODashboard;

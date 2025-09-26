import { 
  Brain, 
  Image as ImageIcon, 
  Users, 
  BookOpen, 
  Clock, 
  Heart,
  Sparkles,
  ChefHat 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Brain,
    title: "AI Cooking Assistant",
    description: "Get personalized cooking tips and recipe suggestions powered by advanced AI",
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    icon: ImageIcon,
    title: "Visual Calorie Counter",
    description: "Snap a photo of your meal and get instant nutritional analysis",
    color: "text-accent",
    bgColor: "bg-accent/10"
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Connect with fellow food lovers and share your culinary creations",
    color: "text-secondary",
    bgColor: "bg-secondary/10"
  },
  {
    icon: BookOpen,
    title: "10,000+ Recipes",
    description: "Discover authentic recipes from cuisines around the world",
    color: "text-tertiary",
    bgColor: "bg-tertiary/10"
  },
  {
    icon: Clock,
    title: "Smart Meal Planning",
    description: "Plan your weekly meals with intelligent suggestions and grocery lists",
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    icon: Heart,
    title: "Dietary Preferences",
    description: "Filter recipes by dietary restrictions and nutritional requirements",
    color: "text-accent",
    bgColor: "bg-accent/10"
  }
];

const premiumFeatures = [
  {
    icon: Sparkles,
    title: "Unlimited AI Assistance",
    description: "Get unlimited access to our AI cooking assistant for personalized help"
  },
  {
    icon: ChefHat,
    title: "Chef Consultations",
    description: "Book virtual sessions with professional chefs for expert guidance"
  },
  {
    icon: ImageIcon,
    title: "Advanced Image Analysis",
    description: "Detailed nutritional breakdown and ingredient identification from photos"
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Everything You Need to
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Cook with Confidence
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            From AI-powered assistance to community-driven recipes, FlavorQuest provides 
            all the tools you need to become a better cook and discover amazing flavors.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div 
                key={feature.title}
                className="group p-6 rounded-xl border border-border bg-card hover:shadow-warm transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`inline-flex p-3 rounded-lg ${feature.bgColor} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Premium Features */}
        <div className="bg-gradient-card rounded-2xl border border-border p-8 lg:p-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              Premium Features
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
              Unlock Your Full Cooking Potential
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Take your culinary journey to the next level with our premium features 
              designed for serious home cooks and food enthusiasts.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-10">
            {premiumFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={feature.title} className="text-center">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                    <IconComponent className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button 
              size="lg" 
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 px-8 py-3 text-lg font-semibold shadow-warm"
            >
              Start Premium Trial
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              7 days free, then $9.99/month. Cancel anytime.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
          {[
            { number: "10,000+", label: "Recipes" },
            { number: "50K+", label: "Active Cooks" },
            { number: "200+", label: "Cuisines" },
            { number: "4.9★", label: "App Rating" }
          ].map((stat, index) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-2xl md:text-3xl font-bold text-primary mb-2">
                {stat.number}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
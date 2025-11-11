import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface ProductReviewsProps {
  productId: string;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [sortBy, setSortBy] = useState("newest");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("is_verified", true)
        .order("review_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const { error } = await supabase.from("reviews").insert({
        product_id: productId,
        user_id: user.id,
        reviewer_name: profile?.full_name || profile?.email || "Anonymous",
        reviewer_avatar: null,
        rating,
        review_title: reviewTitle,
        review_text: reviewText,
        review_images: reviewImages,
        is_verified: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Your review is submitted, thanks for your response",
        description: "Your review will appear after admin approval.",
      });
      setShowReviewDialog(false);
      setRating(0);
      setReviewTitle("");
      setReviewText("");
      setReviewImages([]);
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit review",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleWriteReview = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate(`/auth?redirect=/product/${productId}`);
      return;
    }
    setShowReviewDialog(true);
  };

  const handleSubmitReview = () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    if (!reviewTitle.trim()) {
      toast({ title: "Please enter a review title", variant: "destructive" });
      return;
    }
    if (!reviewText.trim()) {
      toast({ title: "Please write your review", variant: "destructive" });
      return;
    }
    submitReviewMutation.mutate();
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading reviews...</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No reviews yet. Be the first to review this product!
      </div>
    );
  }

  // Calculate statistics
  const totalReviews = reviews.length;
  const averageRating = reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews;
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percentage: (reviews.filter((r) => r.rating === rating).length / totalReviews) * 100,
  }));

  // Sort reviews
  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.review_date).getTime() - new Date(b.review_date).getTime();
      case "highest":
        return b.rating - a.rating;
      case "lowest":
        return a.rating - b.rating;
      case "pictures":
        return (b.review_images?.length || 0) - (a.review_images?.length || 0);
      default: // newest
        return new Date(b.review_date).getTime() - new Date(a.review_date).getTime();
    }
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8 py-8">
      {/* Write Review Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Customer Reviews</h2>
        <Button onClick={handleWriteReview} className="gap-2">
          <Plus className="w-4 h-4" />
          Write a Review
        </Button>
      </div>

      {/* Reviews Summary */}
      <Card className="p-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Average Rating */}
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">{averageRating.toFixed(1)}</div>
            <div className="flex justify-center mb-2">{renderStars(Math.round(averageRating))}</div>
            <div className="text-muted-foreground">
              Based on {totalReviews} review{totalReviews !== 1 ? "s" : ""} ✅
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {ratingDistribution.map((dist) => (
              <div key={dist.rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm">{dist.rating}</span>
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                </div>
                <Progress value={dist.percentage} className="flex-1 h-2" />
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {dist.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Filter Options */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Customer Reviews</h3>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="highest">Highest Rated</SelectItem>
            <SelectItem value="lowest">Lowest Rated</SelectItem>
            <SelectItem value="pictures">Pictures First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {sortedReviews.map((review) => (
          <Card key={review.id} className="p-6">
            <div className="flex gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {review.reviewer_avatar ? (
                  <img
                    src={review.reviewer_avatar}
                    alt={review.reviewer_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {getInitials(review.reviewer_name)}
                  </div>
                )}
              </div>

              {/* Review Content */}
              <div className="flex-1 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{review.reviewer_name}</span>
                  {review.is_verified && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                      ✓ Verified
                    </span>
                  )}
                </div>

                {/* Rating & Title */}
                <div className="space-y-1">
                  {renderStars(review.rating)}
                  <h4 className="font-semibold">{review.review_title}</h4>
                </div>

                {/* Review Text */}
                <p className="text-muted-foreground">{review.review_text}</p>

                {/* Review Images */}
                {review.review_images && review.review_images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {review.review_images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Review ${index + 1}`}
                        className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() => setSelectedImage(image)}
                      />
                    ))}
                  </div>
                )}

                {/* Date */}
                <p className="text-sm text-muted-foreground">
                  {new Date(review.review_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Image Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <img src={selectedImage} alt="Review" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>

      {/* Write Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Star Rating */}
            <div className="space-y-2">
              <Label>Rating *</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-8 h-8 cursor-pointer transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  />
                ))}
              </div>
            </div>

            {/* Review Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Review Title *</Label>
              <Input
                id="title"
                placeholder="Sum up your experience"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {reviewTitle.length}/100 characters
              </p>
            </div>

            {/* Review Text */}
            <div className="space-y-2">
              <Label htmlFor="text">Your Review *</Label>
              <Textarea
                id="text"
                placeholder="Share your experience with this product..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={1000}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                {reviewText.length}/1000 characters
              </p>
            </div>

            {/* Review Images */}
            <ImageUpload
              label="Add Photos (Optional)"
              value={reviewImages}
              onChange={(value) => setReviewImages(Array.isArray(value) ? value : [value])}
              multiple
              folder="reviews"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              disabled={submitReviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={submitReviewMutation.isPending}
            >
              {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

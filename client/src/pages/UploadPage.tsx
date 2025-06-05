import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Organization, Event, Category, Album, insertAlbumSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import UploadDropzone from "@/components/UploadDropzone";

// Extended album schema with validation
const albumFormSchema = insertAlbumSchema.extend({
  name: z.string().min(1, "アルバム名は必須です"),
  price: z.coerce.number().min(100, "価格は100円以上である必要があります"),
  photoPrice: z.coerce.number().min(100, "写真単価は100円以上である必要があります"),
});

type AlbumFormValues = z.infer<typeof albumFormSchema> & {
  photoPrice: number;
};

export default function UploadPage() {
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAlbum, setSelectedAlbum] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<string>("upload");
  const [watermarkText, setWatermarkText] = useState<string>("FIT-CREATE");
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(70);
  const [watermarkPosition, setWatermarkPosition] = useState<string>("center");
  const [applyDiscount, setApplyDiscount] = useState<boolean>(true);
  const { toast } = useToast();

  // Queries
  const { data: organizations } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: [`/api/organizations/${selectedOrg}/events`],
    enabled: !!selectedOrg,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: [`/api/events/${selectedEvent}/categories`],
    enabled: !!selectedEvent,
  });

  const { data: albums } = useQuery<Album[]>({
    queryKey: [`/api/categories/${selectedCategory}/albums`],
    enabled: !!selectedCategory,
  });

  // Form for new album creation
  const form = useForm<AlbumFormValues>({
    resolver: zodResolver(albumFormSchema),
    defaultValues: {
      name: "",
      description: "",
      date: "",
      coverImage: "",
      price: 8500,
      photoPrice: 1200,
      categoryId: 0,
    },
  });

  // Create a new album
  const onSubmit = async (values: AlbumFormValues) => {
    if (!selectedCategory) {
      toast({
        title: "エラー",
        description: "カテゴリーを選択してください",
        variant: "destructive",
      });
      return;
    }

    try {
      const categoryId = parseInt(selectedCategory);
      const { photoPrice, ...albumData } = values;

      const response = await apiRequest("POST", "/api/albums", {
        ...albumData,
        categoryId,
      });

      const newAlbum = await response.json();
      
      toast({
        title: "アルバムを作成しました",
        description: `${values.name} アルバムが正常に作成されました`,
      });

      // Update the selected album
      setSelectedAlbum(newAlbum.id.toString());
      
      // Switch to the upload tab
      setSelectedTab("upload");
      
    } catch (error) {
      toast({
        title: "エラー",
        description: "アルバムの作成に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleUploadSuccess = () => {
    toast({
      title: "アップロード完了",
      description: "すべての写真がアップロードされました",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-6">写真アップロード</h2>
          
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center mr-3">1</div>
              <h3 className="text-lg font-medium">アップロード先を選択</h3>
            </div>
            <div className="pl-11">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <FormLabel>組織:</FormLabel>
                  <Select onValueChange={setSelectedOrg} value={selectedOrg}>
                    <SelectTrigger>
                      <SelectValue placeholder="組織を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <FormLabel>イベント:</FormLabel>
                  <Select onValueChange={setSelectedEvent} value={selectedEvent} disabled={!selectedOrg}>
                    <SelectTrigger>
                      <SelectValue placeholder="イベントを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {events?.map((event) => (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <FormLabel>カテゴリー:</FormLabel>
                  <Select onValueChange={setSelectedCategory} value={selectedCategory} disabled={!selectedEvent}>
                    <SelectTrigger>
                      <SelectValue placeholder="カテゴリーを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">既存のアルバムを選択</TabsTrigger>
                  <TabsTrigger value="new">新規アルバムを作成</TabsTrigger>
                </TabsList>
                
                <TabsContent value="existing" className="mt-4">
                  <Select onValueChange={setSelectedAlbum} value={selectedAlbum} disabled={!selectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="アルバムを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {albums?.map((album) => (
                        <SelectItem key={album.id} value={album.id.toString()}>
                          {album.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
                
                <TabsContent value="new" className="mt-4">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>アルバム名</FormLabel>
                            <FormControl>
                              <Input placeholder="例: 基調講演 - 夕方" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>説明</FormLabel>
                            <FormControl>
                              <Input placeholder="例: 2023年5月15日" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>日付</FormLabel>
                            <FormControl>
                              <Input placeholder="例: 2023年5月15日" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="coverImage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>カバー画像URL</FormLabel>
                            <FormControl>
                              <Input placeholder="例: https://example.com/image.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>アルバム価格 (円)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="photoPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>写真単品価格 (円)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button type="submit" className="bg-accent hover:bg-green-600 text-white">
                        アルバムを作成
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          {selectedAlbum && (
            <>
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center mr-3">2</div>
                  <h3 className="text-lg font-medium">写真のアップロード</h3>
                </div>
                <div className="pl-11">
                  <UploadDropzone
                    albumId={parseInt(selectedAlbum)}
                    onSuccess={handleUploadSuccess}
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center mr-3">3</div>
                  <h3 className="text-lg font-medium">ウォーターマークと価格設定</h3>
                </div>
                <div className="pl-11 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">ウォーターマーク設定</h4>
                    <div className="space-y-3">
                      <div>
                        <FormLabel>テキスト:</FormLabel>
                        <Input 
                          value={watermarkText}
                          onChange={(e) => setWatermarkText(e.target.value)}
                        />
                      </div>
                      <div>
                        <FormLabel>透明度: {watermarkOpacity}%</FormLabel>
                        <Slider
                          value={[watermarkOpacity]}
                          onValueChange={(values) => setWatermarkOpacity(values[0])}
                          min={0}
                          max={100}
                          step={1}
                        />
                      </div>
                      <div>
                        <FormLabel>位置:</FormLabel>
                        <Select value={watermarkPosition} onValueChange={setWatermarkPosition}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="center">中央</SelectItem>
                            <SelectItem value="bottom-left">左下</SelectItem>
                            <SelectItem value="bottom-right">右下</SelectItem>
                            <SelectItem value="top-left">左上</SelectItem>
                            <SelectItem value="top-right">右上</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">価格設定</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="discount-check"
                          checked={applyDiscount}
                          onCheckedChange={(checked) => setApplyDiscount(checked as boolean)}
                        />
                        <label
                          htmlFor="discount-check"
                          className="text-sm text-gray-700"
                        >
                          アルバム割引を適用（単品合計価格より割引）
                        </label>
                      </div>
                      <FormDescription className="text-xs text-gray-500">
                        この設定は新しくアップロードする写真に適用されます。
                        既存の写真の設定は変更されません。
                      </FormDescription>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

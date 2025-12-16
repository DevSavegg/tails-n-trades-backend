CREATE SCHEMA "favorites";
--> statement-breakpoint
CREATE TABLE "favorites"."user_favorites" (
	"user_id" text NOT NULL,
	"pet_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_favorites_user_id_pet_id_pk" PRIMARY KEY("user_id","pet_id")
);
--> statement-breakpoint
ALTER TABLE "favorites"."user_favorites" ADD CONSTRAINT "user_favorites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites"."user_favorites" ADD CONSTRAINT "user_favorites_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "catalog"."pets"("id") ON DELETE no action ON UPDATE no action;
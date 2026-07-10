CREATE TABLE "productos_" (
	"id" varchar(10) PRIMARY KEY NOT NULL,
	"clave" varchar(20),
	"variante" varchar(20),
	"descripcion" text,
	"informacion" text,
	"disponible" varchar(20),
	"marca" varchar(50),
	"categoria" varchar(50),
	"existencias" integer DEFAULT 0,
	"precioant" varchar(30),
	"precio" varchar(30),
	"destacado" boolean DEFAULT false,
	"createdat" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "productos" CASCADE;
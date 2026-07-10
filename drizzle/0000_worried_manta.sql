CREATE TABLE "productos" (
	"id" varchar(10) PRIMARY KEY NOT NULL,
	"clave" varchar(20),
	"variante" varchar(20),
	"descripcion" text,
	"informacion" text,
	"disponible" varchar(20),
	"marca" varchar(50),
	"categoria" varchar(50),
	"existencias" integer DEFAULT 0,
	"precioant" numeric(12, 2),
	"precio" numeric(12, 2),
	"destacado" boolean DEFAULT false,
	"createdat" timestamp DEFAULT now()
);

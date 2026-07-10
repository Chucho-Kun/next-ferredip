CREATE TABLE "productos" (
	"id" varchar(10) PRIMARY KEY NOT NULL,
	"clave" varchar(100),
	"variante" varchar(100),
	"descripcion" text,
	"informacion" text,
	"disponible" varchar(100),
	"marca" varchar(100),
	"categoria" varchar(100),
	"existencias" integer DEFAULT 0,
	"precioant" varchar(100),
	"precio" varchar(100),
	"destacado" boolean DEFAULT false,
	"createdat" timestamp DEFAULT now()
);

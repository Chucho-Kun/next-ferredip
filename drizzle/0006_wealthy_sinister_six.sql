CREATE TABLE "ordenes" (
	"id" serial PRIMARY KEY NOT NULL,
	"mp_payment_id" varchar(40),
	"mp_status" varchar(30),
	"mp_status_detail" varchar(60),
	"payment_method_id" varchar(30),
	"installments" integer,
	"nombre" varchar(100),
	"apellidos" varchar(100),
	"email" varchar(150),
	"telefono" varchar(30),
	"direccion" text,
	"entre_calles" text,
	"ciudad" varchar(100),
	"cp" varchar(10),
	"subtotal" numeric(12, 2),
	"envio" numeric(12, 2),
	"total" numeric(12, 2),
	"items" jsonb DEFAULT '[]'::jsonb,
	"estatus_pedido" varchar(20) DEFAULT 'nuevo',
	"createdat" timestamp DEFAULT now(),
	CONSTRAINT "ordenes_mp_payment_id_unique" UNIQUE("mp_payment_id")
);
--> statement-breakpoint
ALTER TABLE "productos_" ALTER COLUMN "ficha" SET DATA TYPE varchar(150);
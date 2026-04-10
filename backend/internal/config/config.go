package config

import (
	"github.com/spf13/viper"
	"log"
	"strings"
)

type Config struct {
	Server    ServerConfig
	Database  DatabaseConfig
	Redis     RedisConfig
	JWT       JWTConfig
	S3        S3Config
	Telephony TelephonyConfig
	WhatsApp  WhatsAppConfig
	AI        AIConfig
}

type ServerConfig struct {
	Port string `mapstructure:"port"`
	Mode string `mapstructure:"mode"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
	SSLMode  string `mapstructure:"sslmode"`
}

type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

type JWTConfig struct {
	Secret     string `mapstructure:"secret"`
	ExpiryHours int   `mapstructure:"expiry_hours"`
}

type S3Config struct {
	Bucket    string `mapstructure:"bucket"`
	Region    string `mapstructure:"region"`
	AccessKey string `mapstructure:"access_key"`
	SecretKey string `mapstructure:"secret_key"`
	Endpoint  string `mapstructure:"endpoint"`
}

type TelephonyConfig struct {
	Provider  string `mapstructure:"provider"`
	APIURL    string `mapstructure:"api_url"`
	APIKey    string `mapstructure:"api_key"`
	WebhookURL string `mapstructure:"webhook_url"`
}

type WhatsAppConfig struct {
	Provider   string `mapstructure:"provider"`
	APIURL     string `mapstructure:"api_url"`
	APIKey     string `mapstructure:"api_key"`
	WebhookURL string `mapstructure:"webhook_url"`
	PhoneID    string `mapstructure:"phone_id"`
}

type AIConfig struct {
	Provider string `mapstructure:"provider"`
	APIKey   string `mapstructure:"api_key"`
	Model    string `mapstructure:"model"`
	BaseURL  string `mapstructure:"base_url"`
}

func Load() *Config {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./configs")
	viper.AddConfigPath(".")

	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	viper.SetDefault("server.port", "8080")
	viper.SetDefault("server.mode", "debug")
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.sslmode", "disable")
	viper.SetDefault("redis.host", "localhost")
	viper.SetDefault("redis.port", 6379)
	viper.SetDefault("jwt.expiry_hours", 24)
	viper.SetDefault("ai.model", "gpt-4o-mini")

	if err := viper.ReadInConfig(); err != nil {
		log.Printf("Config file not found, using env variables: %v", err)
	}

	cfg := &Config{}
	if err := viper.Unmarshal(cfg); err != nil {
		log.Fatalf("Failed to unmarshal config: %v", err)
	}

	if port := viper.GetString("SERVER_PORT"); port != "" {
		cfg.Server.Port = port
	}
	if dbHost := viper.GetString("DB_HOST"); dbHost != "" {
		cfg.Database.Host = dbHost
	}
	if dbUser := viper.GetString("DB_USER"); dbUser != "" {
		cfg.Database.User = dbUser
	}
	if dbPass := viper.GetString("DB_PASSWORD"); dbPass != "" {
		cfg.Database.Password = dbPass
	}
	if dbName := viper.GetString("DB_NAME"); dbName != "" {
		cfg.Database.DBName = dbName
	}
	if jwtSecret := viper.GetString("JWT_SECRET"); jwtSecret != "" {
		cfg.JWT.Secret = jwtSecret
	}

	return cfg
}

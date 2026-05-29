package com.dispenserlatienda.service.servicio;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.net.URI;

@Service
public class R2StorageService {

    private static final Logger log = LoggerFactory.getLogger(R2StorageService.class);

    @Value("${r2.access-key-id}")
    private String accessKeyId;

    @Value("${r2.secret-access-key}")
    private String secretAccessKey;

    @Value("${r2.endpoint}")
    private String endpoint;

    @Value("${r2.bucket}")
    private String bucket;

    @Value("${r2.public-url}")
    private String publicUrl;

    private S3Client buildClient() {
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKeyId, secretAccessKey)
                ))
                .region(Region.of("auto"))
                .forcePathStyle(true)
                .build();
    }

    public String subir(String filename, byte[] contenido, String contentType) {
        try (S3Client s3 = buildClient()) {
            s3.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(filename)
                            .contentType(contentType)
                            .build(),
                    RequestBody.fromBytes(contenido)
            );
            log.info("R2: archivo subido → {}", filename);
            return filename;
        }
    }

    public void eliminar(String filename) {
        if (filename == null || filename.isBlank()) return;
        try (S3Client s3 = buildClient()) {
            s3.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(filename)
                    .build());
            log.info("R2: archivo eliminado → {}", filename);
        } catch (Exception e) {
            log.warn("R2: no se pudo eliminar {}: {}", filename, e.getMessage());
        }
    }

    public String urlPublica(String filename) {
        return publicUrl + "/" + filename;
    }

    public byte[] descargar(String filename) {
        try (S3Client s3 = buildClient()) {
            return s3.getObjectAsBytes(
                    GetObjectRequest.builder().bucket(bucket).key(filename).build()
            ).asByteArray();
        }
    }
}

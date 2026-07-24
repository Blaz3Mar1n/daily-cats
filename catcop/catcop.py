import torch
import torch.nn as nn
import torchvision.models.video as video_models


class GIFEmbeddingNetwork(nn.Module):

    def __init__(self, embedding_dim=512):
        super(GIFEmbeddingNetwork, self).__init__()

        # 1. Backbone Network: 3D ResNet-18 for spatiotemporal feature extraction
        self.backbone = video_models.r3d_18(
            weights=video_models.R3D_18_Weights.DEFAULT
        )

        # Extract the size of the features entering the final fully connected layer
        in_features = self.backbone.fc.in_features

        # Remove the original classification layer by replacing it with an Identity pass
        self.backbone.fc = nn.Identity()

        # 2. Projection Head: Maps backbone features into the metric learning embedding space
        self.projection_head = nn.Sequential(
            nn.Linear(in_features, 512),
            nn.ReLU(),
            nn.Linear(512, embedding_dim),
        )

    def forward(self, x):
        """Args:

            x: Tensor of shape (B, T, C, H, W) or (T, C, H, W) from preprocessing

        Returns:
            L2-Normalized embedding tensor of shape (B, embedding_dim)
        """
        # Handle unsqueezed single inputs (T, C, H, W) -> (1, T, C, H, W)
        if x.dim() == 4:
            x = x.unsqueeze(0)

        # Permute from (B, T, C, H, W) to the standard torchvision 3D format: (B, C, T, H, W)
        x = x.permute(0, 2, 1, 3, 4)

        # Extract raw features from video sequences
        features = self.backbone(x)  # Shape: (B, in_features)

        # Pass through the projection head
        embeddings = self.projection_head(features)  # Shape: (B, embedding_dim)

        # L2-normalize vectors so Euclidean distance corresponds directly to Cosine Similarity
        normalized_embeddings = nn.functional.normalize(embeddings, p=2, dim=1)

        return normalized_embeddings


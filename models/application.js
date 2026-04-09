'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Application extends Model {
        static associate(models) {
            Application.belongsTo(models.User, { foreignKey: 'userId' });
            Application.belongsTo(models.Internship, { foreignKey: 'internshipId' });
        }
    }
    Application.init({
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'applied'
        },
        ai_feedback: DataTypes.TEXT,
        ai_reason: DataTypes.TEXT,
        applied_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        userId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'id'
            }
        },
        internshipId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'internship_id',
            references: {
                model: 'internships',
                key: 'id'
            }
        }
    }, {
        sequelize,
        modelName: 'Application',
        tableName: 'applications',
        underscored: true,
        timestamps: false
    });
    return Application;
};